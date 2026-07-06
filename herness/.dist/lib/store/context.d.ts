export declare class ContextStore {
    private devkitDir;
    constructor(devkitDir: string);
    agentDir(agentId: string): string;
    save(agentId: string, key: string, data: unknown): Promise<void>;
    load(agentId: string, key: string): Promise<unknown | null>;
    list(agentId: string): Promise<string[]>;
    read(agentId: string): Promise<unknown>;
}
//# sourceMappingURL=context.d.ts.map