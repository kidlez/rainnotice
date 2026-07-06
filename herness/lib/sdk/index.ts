export { Orchestrator } from '../orchestrator'
export { Planner } from '../planner'
export { Designer } from '../designer'
export { Developer } from '../executor'
export { Validator } from '../validator'
export { VictoryGate } from '../victory-gate'
export { Reflector } from '../reflector'
export { Guard } from '../guard'
export {
  HandoffStore,
  ContextStore,
  ArchiveStore,
  TraceStore,
} from '../store'
export {
  CheckpointManager,
  withCheckpoint,
  TrashBin,
} from '../safety'

export type {
  AgentId,
  AgentStatus,
  FeatureStatus,
  Priority,
  TaskSize,
  HandoffState,
  Task,
  FeatureDoc,
  TestCase,
  TestPlan,
  ValidationReport,
  RegressionReport,
  VerificationTask,
  VerificationResult,
  ParallelVerificationReport,
  CircuitBreakerState,
  KnowledgeCard,
  TaskTrace,
  ReflectionInput,
  ReflectionOutput,
  PlannerWeights,
  DesignQuestion,
  DesignInterview,
  DesignArtifacts,
  VictoryVerdict,
  VictoryGateConfig,
  Checkpoint,
  TransactionOutcome,
  TrashEntry,
  GuardReport,
  Violation,
  AgentPermission,
  OrchestratorConfig,
  VerificationTier,
  VerificationType,
  VerificationSeverity,
  HookEvent,
  HookContext,
  HookHandler,
  AgentMemoryEntry,
  AgentProgress,
} from '../../shared/types'

import { Orchestrator } from '../orchestrator'
import { Planner } from '../planner'
import { Designer } from '../designer'
import { Validator } from '../validator'
import { VictoryGate } from '../victory-gate'
import { Guard } from '../guard'
import { CheckpointManager } from '../safety'
import { OrchestratorConfig, VerificationTier } from '../../shared/types'
import * as path from 'path'

export class Pipeline {
  private featuresDir: string
  private devkitDir: string
  private guard: Guard
  private checkpointMgr: CheckpointManager

  constructor(rootDir: string = '.', devkitDir: string = '.devkit') {
    this.featuresDir = path.join(rootDir, 'features')
    this.devkitDir = devkitDir
    const permissions = Guard.createDefaults(rootDir, devkitDir)
    this.guard = new Guard(permissions)
    this.checkpointMgr = new CheckpointManager(devkitDir)
  }

  getGuard(): Guard { return this.guard }

  async plan(featureName: string) {
    const planner = new Planner(this.featuresDir, this.guard)
    const tasks = await planner.decompose(`${featureName}.feature.md`)
    return { tasks, sorted: await planner.sortByPriority(tasks), planner }
  }

  async design(featureName: string, tasks: any[]) {
    const designer = new Designer(this.featuresDir, this.guard)
    const questions = await designer.startInterview(`${featureName}.feature.md`, tasks)
    return { questions, designer }
  }

  async verify(featureName: string, designArtifacts?: any, testPlan?: any, tier: VerificationTier = 'standard') {
    const validator = new Validator(this.featuresDir, this.guard, this.checkpointMgr)
    return validator.validate(featureName, testPlan, designArtifacts, tier)
  }

  async gate(featureName: string, designArtifacts: any, report: any, testPlan?: any) {
    const gate = new VictoryGate(this.featuresDir)
    return gate.evaluate(featureName, designArtifacts, report, testPlan)
  }
}

export function createPipeline(rootDir?: string): Pipeline {
  return new Pipeline(rootDir)
}
