export type AgentId = 'orchestrator' | 'planner' | 'designer' | 'developer' | 'validator' | 'documenter' | 'archiver' | 'reflector';
export type AgentStatus = 'idle' | 'dispatched' | 'running' | 'completed' | 'failed' | 'reviewed';
export type FeatureStatus = 'draft' | 'designed' | 'implemented' | 'verified' | 'archived';
export type Priority = 'P0' | 'P1' | 'P2';
export type TaskSize = 'S' | 'M' | 'L' | 'XL';
export interface HandoffState {
    from: AgentId;
    to: AgentId;
    timestamp: string;
    status: AgentStatus;
    task_id: string;
    feature_id: string;
    payload: Record<string, unknown>;
    result?: Record<string, unknown>;
    error?: string;
}
export interface Task {
    id: string;
    description: string;
    priority: Priority;
    size: TaskSize;
    depends_on: string[];
    assignee: AgentId;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
}
export interface FeatureDoc {
    id: string;
    name: string;
    status: FeatureStatus;
    path: string;
    depends_on: string[];
    priority: Priority;
    tasks: Task[];
    acceptance_criteria: string[];
    changelog: string[];
}
export interface TestCase {
    id: string;
    category: 'unit' | 'functional';
    description: string;
    given: string;
    when: string;
    then: string;
    coverageTarget: string;
}
export interface TestPlan {
    featureName: string;
    unitTests: TestCase[];
    functionalTests: TestCase[];
    regressionTargets: string[];
}
export interface RegressionReport {
    run: boolean;
    featuresChecked: string[];
    allPassed: boolean;
    failures: Array<{
        feature: string;
        detail: string;
    }>;
}
export interface ValidationReport {
    passed: boolean;
    checks: {
        compile: 'passed' | 'failed' | 'skipped';
        typecheck: 'passed' | 'failed' | 'skipped';
        unit_test: 'passed' | 'failed' | 'skipped';
        functional_test: 'passed' | 'failed' | 'skipped';
        lint: 'passed' | 'failed' | 'skipped';
        coverage: 'passed' | 'failed' | 'skipped';
    };
    regression: RegressionReport;
    summary: string;
    failures: Array<{
        check: string;
        detail: string;
    }>;
}
export interface KnowledgeCard {
    type: 'knowledge' | 'pattern' | 'decision';
    id: string;
    title: string;
    tags: string[];
    source_ref: string;
    created: string;
    validated: boolean;
    summary: string;
    body: string;
}
export interface OrchestratorConfig {
    rootDir: string;
    devkitDir: string;
    agents: Record<AgentId, {
        enabled: boolean;
    }>;
    features: string[];
}
export interface TaskTrace {
    taskId: string;
    featureId: string;
    input: string;
    steps: string[];
    errors: Array<{
        message: string;
        fix: string;
    }>;
    output: string;
    durationMs: number;
    timestamp: string;
    similarityTags: string[];
}
export interface ReflectionInput {
    featureName: string;
    failedChecks: string[];
    errorDetails: string[];
    designDoc: string;
    taskDescription: string;
}
export interface ReflectionOutput {
    diagnosis: string;
    rootCause: string;
    suggestedFixes: Array<{
        file: string;
        description: string;
        confidence: 'high' | 'medium' | 'low';
    }>;
    retryRecommended: boolean;
    lessons: string[];
}
export interface PlannerWeights {
    sizeBaseline: Record<string, number>;
    priorityBoost: Record<string, number>;
    sampleCount: number;
    updatedAt: string;
}
export type QuestionCategory = 'scope' | 'data_model' | 'interface' | 'user_flow' | 'edge_cases' | 'non_functional' | 'constraints' | 'integration';
export interface DesignQuestion {
    id: string;
    category: QuestionCategory;
    question: string;
    context: string;
    answer: string;
    resolved: boolean;
    round: number;
    followUpGenerated: boolean;
}
export interface DesignInterview {
    featureName: string;
    featureContent: string;
    tasks: Task[];
    questions: DesignQuestion[];
    currentRound: number;
    startedAt: string;
    completedAt?: string;
}
export interface AgentPermission {
    agentId: AgentId;
    readPaths: string[];
    writePaths: string[];
    forbiddenPaths: string[];
    canReadHandoff: boolean;
    canWriteHandoff: boolean;
    maxFileOps: number;
    canExec: boolean;
}
export interface Violation {
    agentId: AgentId;
    operation: 'read' | 'write' | 'exec' | 'handoff_read' | 'handoff_write';
    target: string;
    reason: string;
    timestamp: string;
}
export interface GuardReport {
    violations: Violation[];
    totalOps: Record<AgentId, number>;
    allClean: boolean;
}
export interface ACVerification {
    acIndex: number;
    acText: string;
    status: 'verified' | 'unverified' | 'disputed';
    evidence: string;
    gaps: string[];
}
export interface CriticQuestion {
    id: string;
    category: 'completeness' | 'correctness' | 'edge_case' | 'spec_gap' | 'assumption';
    question: string;
    assessment: 'passed' | 'flagged' | 'failed';
    detail: string;
}
export interface VictoryVerdict {
    passed: boolean;
    stage: string;
    acVerifications: ACVerification[];
    criticQuestions: CriticQuestion[];
    designCoverage: {
        totalSections: number;
        covered: number;
        missing: string[];
    };
    edgeCasesChecked: string[];
    minimumBarResults: Array<{
        rule: string;
        satisfied: boolean;
    }>;
    blockingIssues: string[];
    retryHints: string[];
    confidence: number;
}
export interface VictoryGateConfig {
    requireACVerification: boolean;
    requireDesignCoverage: boolean;
    requireCriticReview: boolean;
    requireEdgeCaseProbing: boolean;
    minimumBar: string[];
    maxRetries: number;
}
export type VerificationType = 'functional' | 'standards' | 'security';
export type VerificationTier = 'light' | 'standard' | 'deep';
export type VerificationSeverity = 'info' | 'warning' | 'critical';
export interface VerificationTask {
    id: string;
    type: VerificationType;
    tier: VerificationTier;
    checks: string[];
    featureName: string;
    featurePath: string;
    designArtifacts?: DesignArtifacts;
    testPlan?: TestPlan;
}
export interface VerificationResult {
    type: VerificationType;
    passed: boolean;
    severity: VerificationSeverity;
    checks: Record<string, 'passed' | 'failed' | 'skipped'>;
    failures: Array<{
        check: string;
        detail: string;
        severity: VerificationSeverity;
    }>;
    durationMs: number;
    aborted: boolean;
}
export interface CircuitBreakerState {
    tripped: boolean;
    tripReason: string;
    trippedAt: string;
    failureCount: number;
    threshold: number;
    resetAfterMs: number;
}
export interface ParallelVerificationReport {
    passed: boolean;
    results: VerificationResult[];
    regression: RegressionReport;
    circuitBreaker: CircuitBreakerState;
    summary: string;
    totalDurationMs: number;
    failures: Array<{
        type: VerificationType;
        check: string;
        detail: string;
    }>;
}
export interface Checkpoint {
    id: string;
    timestamp: string;
    agentId: AgentId;
    operation: string;
    featureName: string;
    files: Array<{
        originalPath: string;
        snapshotPath: string;
        size: number;
    }>;
    status: 'active' | 'committed' | 'rolled_back';
}
export interface TransactionOutcome<T> {
    result: T | null;
    checkpoint: Checkpoint;
    success: boolean;
    rolledBack: boolean;
    errors: string[];
}
export interface TrashEntry {
    originalPath: string;
    trashPath: string;
    deletedAt: string;
    size: number;
}
export type HookEvent = 'preToolUse' | 'postToolUse' | 'onGuardViolation' | 'onError';
export interface HookContext {
    agentId: AgentId;
    operation: string;
    args: Record<string, unknown>;
    timestamp: string;
}
export interface ToolUseResult {
    success: boolean;
    output: string;
    durationMs: number;
}
export type HookHandler = (context: HookContext, result?: ToolUseResult) => Promise<boolean | void>;
export interface AgentMemoryEntry {
    category: 'decision' | 'convention' | 'fix';
    content: string;
    timestamp: string;
    source: string;
}
export interface AgentProgress {
    agentId: AgentId;
    status: 'idle' | 'running' | 'completed' | 'failed' | 'aborted';
    startedAt?: string;
    completedAt?: string;
    durationMs: number;
    checks: Record<string, string>;
    subAgents: string[];
}
export interface WorktreeState {
    id: string;
    agentId: AgentId;
    featureName: string;
    branch: string;
    worktreePath: string;
    baseBranch: string;
    createdAt: string;
    status: 'active' | 'merged' | 'cleaned';
}
export type DiagramType = 'class' | 'sequence' | 'component' | 'usecase' | 'activity';
export interface DiagramOutput {
    type: DiagramType;
    name: string;
    puml: string;
    description: string;
    filePath: string;
}
export interface DesignArtifacts {
    designDoc: string;
    types: string;
    modules: string[];
    interfaces: string[];
    edgeCases: string[];
    testPlan: TestPlan;
    interview: DesignInterview;
    unresolvedCount: number;
}
//# sourceMappingURL=index.d.ts.map