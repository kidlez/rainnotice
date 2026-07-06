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
exports.ArchiveStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const path_1 = require("../../shared/utils/path");
class ArchiveStore {
    devkitDir;
    categories = ['knowledge', 'patterns', 'decisions'];
    categoryMap = {
        knowledge: 'knowledge',
        pattern: 'patterns',
        decision: 'decisions',
    };
    constructor(devkitDir) {
        this.devkitDir = devkitDir;
    }
    async save(card) {
        const catDir = this.categoryMap[card.type];
        if (!catDir)
            throw new Error(`Unknown card type: ${card.type}`);
        const dir = path.join(this.devkitDir, 'archive', catDir);
        (0, path_1.ensureDir)(dir);
        fs.writeFileSync(path.join(dir, `${card.id}.md`), this.serializeFrontmatter(card), 'utf-8');
    }
    async list(type) {
        const dirs = type
            ? [this.categoryMap[type] ?? type]
            : [...this.categories];
        const cards = [];
        for (const cat of dirs) {
            const dir = path.join(this.devkitDir, 'archive', cat);
            if (!fs.existsSync(dir))
                continue;
            for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
                const content = fs.readFileSync(path.join(dir, file), 'utf-8');
                cards.push(this.parseFrontmatter(content));
            }
        }
        return cards;
    }
    async findByTags(tags) {
        const all = await this.list();
        return all.filter(card => tags.some(t => card.tags.includes(t)));
    }
    serializeFrontmatter(card) {
        const lines = ['---'];
        const fields = [
            ['type', card.type],
            ['id', card.id],
            ['title', card.title],
            ['tags', card.tags],
            ['source_ref', card.source_ref],
            ['created', card.created],
            ['validated', card.validated],
            ['summary', card.summary],
        ];
        for (const [key, value] of fields) {
            if (Array.isArray(value)) {
                lines.push(`${key}: [${value.join(', ')}]`);
            }
            else if (typeof value === 'string') {
                lines.push(`${key}: "${value}"`);
            }
            else if (typeof value === 'boolean' || typeof value === 'number') {
                lines.push(`${key}: ${value}`);
            }
        }
        lines.push('---');
        lines.push('');
        lines.push(card.body);
        return lines.join('\n');
    }
    parseFrontmatter(content) {
        const lines = content.split('\n');
        if (lines[0]?.trim() !== '---')
            throw new Error('Invalid frontmatter format');
        const endIdx = lines.indexOf('---', 1);
        if (endIdx === -1)
            throw new Error('Missing closing ---');
        const frontmatter = lines.slice(1, endIdx);
        const body = lines.slice(endIdx + 1).join('\n').trim();
        const card = { body };
        for (const line of frontmatter) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.includes(':'))
                continue;
            const sep = trimmed.indexOf(':');
            const key = trimmed.slice(0, sep).trim();
            const raw = trimmed.slice(sep + 1).trim();
            if (!key)
                continue;
            if (raw.startsWith('[') && raw.endsWith(']')) {
                card[key] = raw.slice(1, -1).split(',').map(t => t.trim()).filter(Boolean);
            }
            else if (raw === 'true') {
                card[key] = true;
            }
            else if (raw === 'false') {
                card[key] = false;
            }
            else if (raw.startsWith('"') && raw.endsWith('"')) {
                card[key] = raw.slice(1, -1);
            }
            else if (raw.startsWith("'") && raw.endsWith("'")) {
                card[key] = raw.slice(1, -1);
            }
            else {
                card[key] = raw;
            }
        }
        return card;
    }
}
exports.ArchiveStore = ArchiveStore;
//# sourceMappingURL=archive.js.map