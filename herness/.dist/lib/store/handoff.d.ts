import { HandoffState } from '../../shared/types';
export declare class HandoffStore {
    private devkitDir;
    constructor(devkitDir: string);
    write(state: HandoffState): Promise<void>;
    read(): Promise<HandoffState | null>;
    clear(): Promise<void>;
    private serialize;
    private deserialize;
}
//# sourceMappingURL=handoff.d.ts.map