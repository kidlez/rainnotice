import { readFile } from 'fs/promises'
import { join, parse, dirname as pathDirname } from 'path'
import * as fs from 'fs'
import type { Task, AgentId, Priority, TaskSize, PlannerWeights } from '../../shared/types'
import { Guard } from '../guard'

export class Planner {
  private weightsPath: string
  private weights: PlannerWeights
  private pendingDeviations: Array<{ taskId: string; estimated: TaskSize; actual: TaskSize; actualHours: number }>
  private agentId: AgentId = 'planner'

  constructor(
    private featuresDir: string,
    private guard?: Guard
  ) {
    this.weightsPath = join(featuresDir, '..', '.devkit', 'context', 'planner', 'weights.json')
    this.weights = this.loadWeights()
    this.pendingDeviations = []
  }

  async parseFeatureDoc(featurePath: string): Promise<{
    id: string
    name: string
    description: string
    acceptanceCriteria: string[]
    existingTasks: Task[]
  }> {
    const fullPath = join(this.featuresDir, featurePath)
    if (this.guard) this.guard.assertRead(this.agentId, fullPath)
    const content = await readFile(fullPath, 'utf-8')

    const nameMatch = content.match(/^#\s+Feature:\s+(.+)/m)
    const name = nameMatch?.[1]?.trim() ?? ''

    const idMatch = content.match(/^>\s*ID:\s*(\S+)/m)
    const id = idMatch?.[1]?.trim() ?? parse(featurePath).name

    const descMatch = content.match(/##\s+Description\s*\n([\s\S]*?)(?=\n##\s)/)
    const description = descMatch?.[1]?.trim() ?? ''

    const acSection = content.match(/##\s+Acceptance\s+(Criteria|Criterion)\s*\n([\s\S]*?)(?=\n##\s|$)/)
    const acRaw = acSection?.[2] ?? ''
    const acceptanceCriteria = [...acRaw.matchAll(/[-*]\s+\[.?\]?\s*(.+)/g)].map(m => m[1].trim())

    const taskSection = content.match(/##\s+Tasks\s*\n([\s\S]*?)(?=\n##\s|$)/)
    const existingTasks = this._parseTasks(taskSection?.[1] ?? '')

    return { id, name, description, acceptanceCriteria, existingTasks }
  }

  async decompose(featurePath: string): Promise<Task[]> {
    const { description, acceptanceCriteria, existingTasks } = await this.parseFeatureDoc(featurePath)

    if (existingTasks.length > 0) return existingTasks
    if (acceptanceCriteria.length === 0) return this._generateDefaultTasks(description)

    const generated: Task[] = []
    const implIds: string[] = []

    for (let i = 0; i < acceptanceCriteria.length; i++) {
      const ac = acceptanceCriteria[i]
      const taskType = this._classifyTaskType(ac)
      const id = `TASK-${String(i + 1).padStart(3, '0')}`

      const task: Task = {
        id,
        description: ac,
        priority: this._estimatePriority(ac, i),
        size: this._estimateSize(ac),
        depends_on: [],
        assignee: taskType.assignee,
        status: 'pending',
      }

      generated.push(task)
      if (task.assignee === 'developer' || task.assignee === 'designer') {
        implIds.push(id)
      }
    }

    if (implIds.length > 0) {
      generated.push({
        id: `TASK-${String(generated.length + 1).padStart(3, '0')}`,
        description: 'Verify all acceptance criteria are met',
        priority: 'P1',
        size: implIds.length > 3 ? 'M' : 'S',
        depends_on: [...implIds],
        assignee: 'validator',
        status: 'pending',
      })
    }

    generated.push({
      id: `TASK-${String(generated.length + 1).padStart(3, '0')}`,
      description: `Document feature${description ? ': ' + description : ''}`,
      priority: 'P2',
      size: 'S',
      depends_on: implIds.length > 0 ? [...implIds] : generated.map(t => t.id),
      assignee: 'documenter',
      status: 'pending',
    })

    return generated
  }

  async buildDependencyGraph(tasks: Task[]): Promise<{ taskId: string; dependsOn: string[] }[]> {
    const graph = tasks.map(t => ({
      taskId: t.id,
      dependsOn: [...t.depends_on],
    }))

    const visited = new Set<string>()
    const recStack = new Set<string>()
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    let hasCycle = false

    function dfs(nodeId: string): boolean {
      if (recStack.has(nodeId)) return true
      if (visited.has(nodeId)) return false

      visited.add(nodeId)
      recStack.add(nodeId)

      const task = taskMap.get(nodeId)
      if (task) {
        for (const dep of task.depends_on) {
          if (dfs(dep)) return true
        }
      }

      recStack.delete(nodeId)
      return false
    }

    for (const t of tasks) {
      if (dfs(t.id)) {
        hasCycle = true
        break
      }
    }

    if (hasCycle) {
      const cycleNodes = [...recStack]
      for (const nodeId of cycleNodes) {
        const entry = graph.find(g => g.taskId === nodeId)
        if (entry) entry.dependsOn = []
      }
    }

    return graph
  }

  async sortByPriority(tasks: Task[]): Promise<Task[]> {
    const groups: Record<Priority, Task[]> = { P0: [], P1: [], P2: [] }
    for (const t of tasks) {
      groups[t.priority].push(t)
    }

    const result: Task[] = []
    for (const priority of ['P0', 'P1', 'P2'] as Priority[]) {
      result.push(...this._topologicalSort(groups[priority]))
    }

    return result
  }

  recordDeviation(taskId: string, estimated: TaskSize, actual: TaskSize, actualHours: number): void {
    this.pendingDeviations.push({ taskId, estimated, actual, actualHours })
  }

  async evolveIfReady(): Promise<boolean> {
    if (this.pendingDeviations.length < 3) return false

    const alpha = 0.3

    for (const dev of this.pendingDeviations) {
      const oldBaseline = this.weights.sizeBaseline[dev.estimated]
      this.weights.sizeBaseline[dev.estimated] = alpha * dev.actualHours + (1 - alpha) * oldBaseline
    }

    let totalExpected = 0
    let totalActual = 0
    for (const dev of this.pendingDeviations) {
      totalExpected += this.weights.sizeBaseline[dev.estimated]
      totalActual += dev.actualHours
    }

    if (totalExpected > 0) {
      const ratio = totalActual / totalExpected
      const boostAlpha = 0.1
      const boostAdj = boostAlpha * ratio + (1 - boostAlpha)

      for (const key of Object.keys(this.weights.priorityBoost)) {
        const newBoost = this.weights.priorityBoost[key] * boostAdj
        this.weights.priorityBoost[key] = Math.max(0.1, Math.min(1.0, newBoost))
      }
    }

    this.weights.sampleCount += this.pendingDeviations.length
    this.pendingDeviations = []
    this.saveWeights()
    return true
  }

  private loadWeights(): PlannerWeights {
    if (!fs.existsSync(this.weightsPath)) {
      return {
        sizeBaseline: { S: 0.5, M: 2, L: 8, XL: 16 },
        priorityBoost: { critical: 0.9, urgent: 0.8, blocker: 0.7, must: 0.6, essential: 0.5, core: 0.4 },
        sampleCount: 0,
        updatedAt: new Date().toISOString(),
      }
    }
    return JSON.parse(fs.readFileSync(this.weightsPath, 'utf-8')) as PlannerWeights
  }

  private saveWeights(): void {
    const dir = pathDirname(this.weightsPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    this.weights.updatedAt = new Date().toISOString()
    if (this.guard) this.guard.assertWrite(this.agentId, this.weightsPath)
    fs.writeFileSync(this.weightsPath, JSON.stringify(this.weights, null, 2), 'utf-8')
  }

  private _classifyTaskType(text: string): { assignee: AgentId; type: string } {
    const lower = text.toLowerCase()
    if (/\b(test|verify|validate|check|assert|ensure)\b/.test(lower)) {
      return { assignee: 'validator', type: 'testing' }
    }
    if (/\b(design|layout|ui|ux|mockup|wireframe|prototype)\b/.test(lower)) {
      return { assignee: 'designer', type: 'design' }
    }
    if (/\b(doc|document|readme|manual|guide|changelog)\b/.test(lower)) {
      return { assignee: 'documenter', type: 'documentation' }
    }
    if (/\b(archive|deprecat|cleanup|remove|delete)\b/.test(lower)) {
      return { assignee: 'archiver', type: 'archival' }
    }
    return { assignee: 'developer', type: 'implementation' }
  }

  private _estimatePriority(text: string, index: number): Priority {
    const lower = text.toLowerCase()

    if (/\b(critical|urgent|blocker|must|essential|core)\b/.test(lower)) {
      if (this.weights.sampleCount >= 10) {
        const p0Keywords = ['critical', 'urgent', 'blocker', 'must', 'essential', 'core']
        const matchedBoosts = p0Keywords
          .filter(kw => new RegExp(`\\b${kw}\\b`).test(lower))
          .map(kw => this.weights.priorityBoost[kw])
          .filter((b): b is number => b !== undefined)

        if (matchedBoosts.length > 0) {
          const boost = Math.max(...matchedBoosts)
          if (boost >= 0.7) return 'P0'
          if (boost >= 0.5) return 'P1'
          return 'P2'
        }
      }
      return 'P0'
    }

    if (/\b(should|nice.to.have|optional|maybe|consider)\b/.test(lower)) return 'P2'
    if (index < 3) return 'P0'
    if (index < 6) return 'P1'
    return 'P2'
  }

  private _estimateSize(text: string): TaskSize {
    const wordCount = text.split(/\s+/).length
    const hasComplexity = /\b(integrat|configur|complex|multiple|several|various|extensive|comprehensive)\b/i.test(text)

    let size: TaskSize
    if (wordCount < 10 && !hasComplexity) size = 'S'
    else if (wordCount < 20 && !hasComplexity) size = 'M'
    else if (wordCount < 30 || hasComplexity) size = 'L'
    else size = 'XL'

    if (this.weights.sampleCount > 10) {
      const textHours = wordCount * 0.25 * (hasComplexity ? 2 : 1)
      const baselines = this.weights.sizeBaseline

      const sizes: TaskSize[] = ['S', 'M', 'L', 'XL']
      let bestSize: TaskSize = size
      let bestDiff = Math.abs(textHours - baselines[size])

      for (const s of sizes) {
        const diff = Math.abs(textHours - baselines[s])
        if (diff < bestDiff) {
          bestDiff = diff
          bestSize = s
        }
      }

      size = bestSize
    }

    return size
  }

  private _parseTasks(section: string): Task[] {
    if (!section.trim()) return []

    const tasks: Task[] = []
    const blocks = section.split(/(?=###\s+)/)

    for (const block of blocks) {
      if (!/###\s+(TASK-\d+)/.test(block)) continue

      const id = block.match(/###\s+(TASK-\d+)/)![1]

      const descMatch = block.match(/>\s*Description:\s*(.+)/)
      const description = descMatch?.[1]?.trim() ?? block.split('\n').slice(2).find(l => l.trim() && !l.startsWith('>'))?.trim() ?? ''

      const priority: Priority = (block.match(/>\s*Priority:\s*(P[012])/)?.[1] as Priority) ?? 'P1'
      const size: TaskSize = (block.match(/>\s*Size:\s*(S|M|L|XL)/)?.[1] as TaskSize) ?? 'M'

      const depMatch = block.match(/>\s*Depends on:\s*(.+)/)
      const depends_on = depMatch?.[1]?.split(/,\s*/).filter(Boolean) ?? []

      const assignee: AgentId = (block.match(/>\s*Assignee:\s*(\S+)/)?.[1] as AgentId) ?? 'developer'

      tasks.push({ id, description, priority, size, depends_on, assignee, status: 'pending' })
    }

    return tasks
  }

  private _topologicalSort(tasks: Task[]): Task[] {
    if (tasks.length <= 1) return tasks

    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const inDegree = new Map<string, number>()
    const adj = new Map<string, string[]>()

    for (const t of tasks) {
      inDegree.set(t.id, 0)
      adj.set(t.id, [])
    }

    for (const t of tasks) {
      for (const dep of t.depends_on) {
        if (taskMap.has(dep)) {
          adj.get(dep)!.push(t.id)
          inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1)
        }
      }
    }

    const queue: string[] = []
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id)
    }

    const sorted: Task[] = []
    while (queue.length > 0) {
      queue.sort()
      const nodeId = queue.shift()!
      const task = taskMap.get(nodeId)
      if (task) sorted.push(task)

      for (const neighbor of adj.get(nodeId) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) queue.push(neighbor)
      }
    }

    const remaining = tasks.filter(t => !sorted.some(s => s.id === t.id))
    sorted.push(...remaining)

    return sorted
  }

  private _generateDefaultTasks(description: string): Task[] {
    return [
      {
        id: 'TASK-001',
        description: `Implement: ${description || 'Feature implementation'}`,
        priority: 'P0',
        size: 'M',
        depends_on: [],
        assignee: 'developer',
        status: 'pending',
      },
      {
        id: 'TASK-002',
        description: 'Write tests for the implementation',
        priority: 'P1',
        size: 'S',
        depends_on: ['TASK-001'],
        assignee: 'validator',
        status: 'pending',
      },
      {
        id: 'TASK-003',
        description: 'Document the feature',
        priority: 'P2',
        size: 'S',
        depends_on: ['TASK-001'],
        assignee: 'documenter',
        status: 'pending',
      },
    ]
  }
}
