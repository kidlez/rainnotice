"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withCheckpoint = withCheckpoint;
async function withCheckpoint(checkpointMgr, agentId, operation, featureName, filePaths, fn) {
    const checkpoint = await checkpointMgr.create(agentId, operation, featureName, filePaths);
    try {
        const result = await fn();
        await checkpointMgr.commit(checkpoint);
        return { result, checkpoint, success: true, rolledBack: false, errors: [] };
    }
    catch (err) {
        const errors = [err instanceof Error ? err.message : String(err)];
        try {
            await checkpointMgr.rollback(checkpoint);
            return { result: null, checkpoint, success: false, rolledBack: true, errors };
        }
        catch (rollbackErr) {
            errors.push('Rollback failed: ' +
                (rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)));
            return { result: null, checkpoint, success: false, rolledBack: false, errors };
        }
    }
}
//# sourceMappingURL=transaction.js.map