import { KnowledgeCard } from '../../shared/types';
export declare class ArchiveStore {
    private devkitDir;
    readonly categories: readonly ["knowledge", "patterns", "decisions"];
    private readonly categoryMap;
    constructor(devkitDir: string);
    save(card: KnowledgeCard): Promise<void>;
    list(type?: string): Promise<KnowledgeCard[]>;
    findByTags(tags: string[]): Promise<KnowledgeCard[]>;
    private serializeFrontmatter;
    private parseFrontmatter;
}
//# sourceMappingURL=archive.d.ts.map