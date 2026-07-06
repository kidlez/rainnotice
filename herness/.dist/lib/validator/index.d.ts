import { ParallelVerificationReport, CircuitBreakerState, RegressionReport, TestPlan, DesignArtifacts, ValidationReport, VerificationTier } from '../../shared/types';
import { Guard } from '../guard';
import { CheckpointManager } from '../safety/checkpoint';
export declare class Validator {
    private featuresDir;
    private guard?;
    private functionalVerifier;
    private standardsVerifier;
    private securityVerifier;
    private checkpointMgr;
    private breaker;
    constructor(featuresDir: string, guard?: Guard | undefined, checkpointMgr?: CheckpointManager);
    validate(featureName: string, testPlan?: TestPlan, designArtifacts?: DesignArtifacts, tier?: VerificationTier): Promise<ParallelVerificationReport>;
    validateSimple(featureName: string, tier?: VerificationTier): Promise<ValidationReport>;
    getBreakerState(): CircuitBreakerState;
    resetBreaker(): void;
    checkRegression(featureName: string, regressionTargets: string[]): Promise<RegressionReport>;
    private mapCheckName;
}
//# sourceMappingURL=index.d.ts.map