import { CheckpointManager } from './checkpoint';
import { TransactionOutcome, AgentId } from '../../shared/types';
export declare function withCheckpoint<T>(checkpointMgr: CheckpointManager, agentId: AgentId, operation: string, featureName: string, filePaths: string[], fn: () => Promise<T>): Promise<TransactionOutcome<T>>;
//# sourceMappingURL=transaction.d.ts.map