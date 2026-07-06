import { VerificationTask, VerificationResult } from '../../shared/types';
export declare class FunctionalVerifier {
    private featuresDir;
    constructor(featuresDir: string);
    verify(task: VerificationTask, signal?: AbortSignal): Promise<VerificationResult>;
}
//# sourceMappingURL=functional.d.ts.map