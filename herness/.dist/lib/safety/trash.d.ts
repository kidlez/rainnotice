import { TrashEntry } from '../../shared/types';
export declare class TrashBin {
    private devkitDir;
    private trashDir;
    constructor(devkitDir: string);
    moveToTrash(filePath: string): Promise<TrashEntry | null>;
    restore(filePath: string): Promise<string | null>;
    list(): Promise<TrashEntry[]>;
    purge(olderThanHours?: number): Promise<number>;
}
//# sourceMappingURL=trash.d.ts.map