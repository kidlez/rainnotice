import { VerificationTask, VerificationResult } from '../../shared/types';
export declare class StandardsVerifier {
    private featuresDir;
    constructor(featuresDir: string);
    verify(task: VerificationTask, signal?: AbortSignal): Promise<VerificationResult>;
}
//# sourceMappingURL=standards.d.ts.map