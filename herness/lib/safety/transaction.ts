import { CheckpointManager } from './checkpoint'
import { Checkpoint, TransactionOutcome, AgentId } from '../../shared/types'

export async function withCheckpoint<T>(
  checkpointMgr: CheckpointManager,
  agentId: AgentId,
  operation: string,
  featureName: string,
  filePaths: string[],
  fn: () => Promise<T>,
): Promise<TransactionOutcome<T>> {
  const checkpoint = await checkpointMgr.create(
    agentId,
    operation,
    featureName,
    filePaths,
  )

  try {
    const result = await fn()
    await checkpointMgr.commit(checkpoint)
    return { result, checkpoint, success: true, rolledBack: false, errors: [] }
  } catch (err) {
    const errors = [err instanceof Error ? err.message : String(err)]
    try {
      await checkpointMgr.rollback(checkpoint)
      return { result: null, checkpoint, success: false, rolledBack: true, errors }
    } catch (rollbackErr) {
      errors.push(
        'Rollback failed: ' +
          (rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)),
      )
      return { result: null, checkpoint, success: false, rolledBack: false, errors }
    }
  }
}
