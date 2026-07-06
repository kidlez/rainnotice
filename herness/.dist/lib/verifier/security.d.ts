import { VerificationTask, VerificationResult } from '../../shared/types';
export declare class SecurityVerifier {
    private featuresDir;
    constructor(featuresDir: string);
    verify(task: VerificationTask, signal?: AbortSignal): Promise<VerificationResult>;
}
//# sourceMappingURL=security.d.ts.map