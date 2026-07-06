import { VictoryVerdict, VictoryGateConfig, TestPlan, DesignArtifacts, ValidationReport } from '../../shared/types';
export declare class VictoryGate {
    private featuresDir;
    private config;
    private retryCount;
    private previousVerdicts;
    constructor(featuresDir: string, config?: VictoryGateConfig);
    evaluate(featureName: string, designArtifacts: DesignArtifacts, validationReport: ValidationReport, testPlan?: TestPlan): Promise<VictoryVerdict>;
    getRetryCount(): number;
    getPreviousVerdicts(): VictoryVerdict[];
    private verifyAcceptanceCriteria;
    private checkDesignCoverage;
    private runCriticReview;
    private probeEdgeCases;
    private readFeatureDoc;
    private readAllSrc;
    private walkFiles;
    private searchInDir;
    private generateRetryHint;
    private hasImproved;
}
//# sourceMappingURL=index.d.ts.map