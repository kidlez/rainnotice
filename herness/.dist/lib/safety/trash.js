"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrashBin = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const path_1 = require("../../shared/utils/path");
class TrashBin {
    devkitDir;
    trashDir;
    constructor(devkitDir) {
        this.devkitDir = devkitDir;
        this.trashDir = path.join(devkitDir, 'trash');
    }
    async moveToTrash(filePath) {
        if (!fs.existsSync(filePath))
            return null;
        (0, path_1.ensureDir)(this.trashDir);
        const stat = fs.statSync(filePath);
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const trashName = `${id}-${path.basename(filePath)}`;
        const trashPath = path.join(this.trashDir, trashName);
        fs.copyFileSync(filePath, trashPath);
        if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
        }
        else {
            fs.unlinkSync(filePath);
        }
        const entry = {
            originalPath: path.resolve(filePath),
            trashPath: path.resolve(trashPath),
            deletedAt: new Date().toISOString(),
            size: stat.size,
        };
        fs.writeFileSync(path.join(this.trashDir, `${id}.json`), JSON.stringify(entry, null, 2), 'utf-8');
        return entry;
    }
    async restore(filePath) {
        if (!fs.existsSync(this.trashDir))
            return null;
        const entries = await this.list();
        const entry = entries.find((e) => e.originalPath === path.resolve(filePath));
        if (!entry || !fs.existsSync(entry.trashPath))
            return null;
        const destDir = path.dirname(entry.originalPath);
        if (!fs.existsSync(destDir))
            fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(entry.trashPath, entry.originalPath);
        fs.unlinkSync(entry.trashPath);
        const metaFile = path.join(this.trashDir, path.basename(entry.trashPath).split('-')[0] + '.json');
        if (fs.existsSync(metaFile))
            fs.unlinkSync(metaFile);
        return entry.originalPath;
    }
    async list() {
        if (!fs.existsSync(this.trashDir))
            return [];
        const entries = [];
        for (const file of fs.readdirSync(this.trashDir)) {
            if (!file.endsWith('.json'))
                continue;
            try {
                const content = JSON.parse(fs.readFileSync(path.join(this.trashDir, file), 'utf-8'));
                entries.push(content);
            }
            catch {
                // skip
            }
        }
        return entries.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    }
    async purge(olderThanHours = 24) {
        if (!fs.existsSync(this.trashDir))
            return 0;
        const cutoff = Date.now() - olderThanHours * 3600 * 1000;
        let removed = 0;
        for (const file of fs.readdirSync(this.trashDir)) {
            const full = path.join(this.trashDir, file);
            const stat = fs.statSync(full);
            if (stat.mtimeMs < cutoff) {
                fs.unlinkSync(full);
                removed++;
            }
        }
        for (const file of fs.readdirSync(this.trashDir)) {
            if (file.endsWith('.json')) {
                const metaPath = path.join(this.trashDir, file);
                const trashFile = metaPath.replace('.json', '');
                if (!fs.existsSync(trashFile)) {
                    fs.unlinkSync(metaPath);
                }
            }
        }
        return removed;
    }
}
exports.TrashBin = TrashBin;
//# sourceMappingURL=trash.js.map