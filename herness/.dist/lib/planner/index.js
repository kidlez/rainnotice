"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const fs = __importStar(require("fs"));
class Planner {
    featuresDir;
    guard;
    weightsPath;
    weights;
    pendingDeviations;
    agentId = 'planner';
    constructor(featuresDir, guard) {
        this.featuresDir = featuresDir;
        this.guard = guard;
        this.weightsPath = (0, path_1.join)(featuresDir, '..', '.devkit', 'context', 'planner', 'weights.json');
        this.weights = this.loadWeights();
        this.pendingDeviations = [];
    }
    async parseFeatureDoc(featurePath) {
        const fullPath = (0, path_1.join)(this.featuresDir, featurePath);
        if (this.guard)
            this.guard.assertRead(this.agentId, fullPath);
        const content = await (0, promises_1.readFile)(fullPath, 'utf-8');
        const nameMatch = content.match(/^#\s+Feature:\s+(.+)/m);
        const name = nameMatch?.[1]?.trim() ?? '';
        const idMatch = content.match(/^>\s*ID:\s*(\S+)/m);
        const id = idMatch?.[1]?.trim() ?? (0, path_1.parse)(featurePath).name;
        const descMatch = content.match(/##\s+Description\s*\n([\s\S]*?)(?=\n##\s)/);
        const description = descMatch?.[1]?.trim() ?? '';
        const acSection = content.match(/##\s+Acceptance\s+(Criteria|Criterion)\s*\n([\s\S]*?)(?=\n##\s|$)/);
        const acRaw = acSection?.[2] ?? '';
        const acceptanceCriteria = [...acRaw.matchAll(/[-*]\s+\[.?\]?\s*(.+)/g)].map(m => m[1].trim());
        const taskSection = content.match(/##\s+Tasks\s*\n([\s\S]*?)(?=\n##\s|$)/);
        const existingTasks = this._parseTasks(taskSection?.[1] ?? '');
        return { id, name, description, acceptanceCriteria, existingTasks };
    }
    async decompose(featurePath) {
        const { description, acceptanceCriteria, existingTasks } = await this.parseFeatureDoc(featurePath);
        if (existingTasks.length > 0)
            return existingTasks;
        if (acceptanceCriteria.length === 0)
            return this._generateDefaultTasks(description);
        const generated = [];
        const implIds = [];
        for (let i = 0; i < acceptanceCriteria.length; i++) {
            const ac = acceptanceCriteria[i];
            const taskType = this._classifyTaskType(ac);
            const id = `TASK-${String(i + 1).padStart(3, '0')}`;
            const task = {
                id,
                description: ac,
                priority: this._estimatePriority(ac, i),
                size: this._estimateSize(ac),
                depends_on: [],
                assignee: taskType.assignee,
                status: 'pending',
            };
            generated.push(task);
            if (task.assignee === 'developer' || task.assignee === 'designer') {
                implIds.push(id);
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
            });
        }
        generated.push({
            id: `TASK-${String(generated.length + 1).padStart(3, '0')}`,
            description: `Document feature${description ? ': ' + description : ''}`,
            priority: 'P2',
            size: 'S',
            depends_on: implIds.length > 0 ? [...implIds] : generated.map(t => t.id),
            assignee: 'documenter',
            status: 'pending',
        });
        return generated;
    }
    async buildDependencyGraph(tasks) {
        const graph = tasks.map(t => ({
            taskId: t.id,
            dependsOn: [...t.depends_on],
        }));
        const visited = new Set();
        const recStack = new Set();
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        let hasCycle = false;
        function dfs(nodeId) {
            if (recStack.has(nodeId))
                return true;
            if (visited.has(nodeId))
                return false;
            visited.add(nodeId);
            recStack.add(nodeId);
            const task = taskMap.get(nodeId);
            if (task) {
                for (const dep of task.depends_on) {
                    if (dfs(dep))
                        return true;
                }
            }
            recStack.delete(nodeId);
            return false;
        }
        for (const t of tasks) {
            if (dfs(t.id)) {
                hasCycle = true;
                break;
            }
        }
        if (hasCycle) {
            const cycleNodes = [...recStack];
            for (const nodeId of cycleNodes) {
                const entry = graph.find(g => g.taskId === nodeId);
                if (entry)
                    entry.dependsOn = [];
            }
        }
        return graph;
    }
    async sortByPriority(tasks) {
        const groups = { P0: [], P1: [], P2: [] };
        for (const t of tasks) {
            groups[t.priority].push(t);
        }
        const result = [];
        for (const priority of ['P0', 'P1', 'P2']) {
            result.push(...this._topologicalSort(groups[priority]));
        }
        return result;
    }
    recordDeviation(taskId, estimated, actual, actualHours) {
        this.pendingDeviations.push({ taskId, estimated, actual, actualHours });
    }
    async evolveIfReady() {
        if (this.pendingDeviations.length < 3)
            return false;
        const alpha = 0.3;
        for (const dev of this.pendingDeviations) {
            const oldBaseline = this.weights.sizeBaseline[dev.estimated];
            this.weights.sizeBaseline[dev.estimated] = alpha * dev.actualHours + (1 - alpha) * oldBaseline;
        }
        let totalExpected = 0;
        let totalActual = 0;
        for (const dev of this.pendingDeviations) {
            totalExpected += this.weights.sizeBaseline[dev.estimated];
            totalActual += dev.actualHours;
        }
        if (totalExpected > 0) {
            const ratio = totalActual / totalExpected;
            const boostAlpha = 0.1;
            const boostAdj = boostAlpha * ratio + (1 - boostAlpha);
            for (const key of Object.keys(this.weights.priorityBoost)) {
                const newBoost = this.weights.priorityBoost[key] * boostAdj;
                this.weights.priorityBoost[key] = Math.max(0.1, Math.min(1.0, newBoost));
            }
        }
        this.weights.sampleCount += this.pendingDeviations.length;
        this.pendingDeviations = [];
        this.saveWeights();
        return true;
    }
    loadWeights() {
        if (!fs.existsSync(this.weightsPath)) {
            return {
                sizeBaseline: { S: 0.5, M: 2, L: 8, XL: 16 },
                priorityBoost: { critical: 0.9, urgent: 0.8, blocker: 0.7, must: 0.6, essential: 0.5, core: 0.4 },
                sampleCount: 0,
                updatedAt: new Date().toISOString(),
            };
        }
        return JSON.parse(fs.readFileSync(this.weightsPath, 'utf-8'));
    }
    saveWeights() {
        const dir = (0, path_1.dirname)(this.weightsPath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        this.weights.updatedAt = new Date().toISOString();
        if (this.guard)
            this.guard.assertWrite(this.agentId, this.weightsPath);
        fs.writeFileSync(this.weightsPath, JSON.stringify(this.weights, null, 2), 'utf-8');
    }
    _classifyTaskType(text) {
        const lower = text.toLowerCase();
        if (/\b(test|verify|validate|check|assert|ensure)\b/.test(lower)) {
            return { assignee: 'validator', type: 'testing' };
        }
        if (/\b(design|layout|ui|ux|mockup|wireframe|prototype)\b/.test(lower)) {
            return { assignee: 'designer', type: 'design' };
        }
        if (/\b(doc|document|readme|manual|guide|changelog)\b/.test(lower)) {
            return { assignee: 'documenter', type: 'documentation' };
        }
        if (/\b(archive|deprecat|cleanup|remove|delete)\b/.test(lower)) {
            return { assignee: 'archiver', type: 'archival' };
        }
        return { assignee: 'developer', type: 'implementation' };
    }
    _estimatePriority(text, index) {
        const lower = text.toLowerCase();
        if (/\b(critical|urgent|blocker|must|essential|core)\b/.test(lower)) {
            if (this.weights.sampleCount >= 10) {
                const p0Keywords = ['critical', 'urgent', 'blocker', 'must', 'essential', 'core'];
                const matchedBoosts = p0Keywords
                    .filter(kw => new RegExp(`\\b${kw}\\b`).test(lower))
                    .map(kw => this.weights.priorityBoost[kw])
                    .filter((b) => b !== undefined);
                if (matchedBoosts.length > 0) {
                    const boost = Math.max(...matchedBoosts);
                    if (boost >= 0.7)
                        return 'P0';
                    if (boost >= 0.5)
                        return 'P1';
                    return 'P2';
                }
            }
            return 'P0';
        }
        if (/\b(should|nice.to.have|optional|maybe|consider)\b/.test(lower))
            return 'P2';
        if (index < 3)
            return 'P0';
        if (index < 6)
            return 'P1';
        return 'P2';
    }
    _estimateSize(text) {
        const wordCount = text.split(/\s+/).length;
        const hasComplexity = /\b(integrat|configur|complex|multiple|several|various|extensive|comprehensive)\b/i.test(text);
        let size;
        if (wordCount < 10 && !hasComplexity)
            size = 'S';
        else if (wordCount < 20 && !hasComplexity)
            size = 'M';
        else if (wordCount < 30 || hasComplexity)
            size = 'L';
        else
            size = 'XL';
        if (this.weights.sampleCount > 10) {
            const textHours = wordCount * 0.25 * (hasComplexity ? 2 : 1);
            const baselines = this.weights.sizeBaseline;
            const sizes = ['S', 'M', 'L', 'XL'];
            let bestSize = size;
            let bestDiff = Math.abs(textHours - baselines[size]);
            for (const s of sizes) {
                const diff = Math.abs(textHours - baselines[s]);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestSize = s;
                }
            }
            size = bestSize;
        }
        return size;
    }
    _parseTasks(section) {
        if (!section.trim())
            return [];
        const tasks = [];
        const blocks = section.split(/(?=###\s+)/);
        for (const block of blocks) {
            if (!/###\s+(TASK-\d+)/.test(block))
                continue;
            const id = block.match(/###\s+(TASK-\d+)/)[1];
            const descMatch = block.match(/>\s*Description:\s*(.+)/);
            const description = descMatch?.[1]?.trim() ?? block.split('\n').slice(2).find(l => l.trim() && !l.startsWith('>'))?.trim() ?? '';
            const priority = block.match(/>\s*Priority:\s*(P[012])/)?.[1] ?? 'P1';
            const size = block.match(/>\s*Size:\s*(S|M|L|XL)/)?.[1] ?? 'M';
            const depMatch = block.match(/>\s*Depends on:\s*(.+)/);
            const depends_on = depMatch?.[1]?.split(/,\s*/).filter(Boolean) ?? [];
            const assignee = block.match(/>\s*Assignee:\s*(\S+)/)?.[1] ?? 'developer';
            tasks.push({ id, description, priority, size, depends_on, assignee, status: 'pending' });
        }
        return tasks;
    }
    _topologicalSort(tasks) {
        if (tasks.length <= 1)
            return tasks;
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const inDegree = new Map();
        const adj = new Map();
        for (const t of tasks) {
            inDegree.set(t.id, 0);
            adj.set(t.id, []);
        }
        for (const t of tasks) {
            for (const dep of t.depends_on) {
                if (taskMap.has(dep)) {
                    adj.get(dep).push(t.id);
                    inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1);
                }
            }
        }
        const queue = [];
        for (const [id, degree] of inDegree) {
            if (degree === 0)
                queue.push(id);
        }
        const sorted = [];
        while (queue.length > 0) {
            queue.sort();
            const nodeId = queue.shift();
            const task = taskMap.get(nodeId);
            if (task)
                sorted.push(task);
            for (const neighbor of adj.get(nodeId) ?? []) {
                const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
                inDegree.set(neighbor, newDegree);
                if (newDegree === 0)
                    queue.push(neighbor);
            }
        }
        const remaining = tasks.filter(t => !sorted.some(s => s.id === t.id));
        sorted.push(...remaining);
        return sorted;
    }
    _generateDefaultTasks(description) {
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
        ];
    }
}
exports.Planner = Planner;
//# sourceMappingURL=index.js.map