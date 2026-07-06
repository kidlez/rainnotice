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
exports.AgentMemory = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const path_1 = require("../../shared/utils/path");
class AgentMemory {
    devkitDir;
    memoryDir;
    constructor(devkitDir) {
        this.devkitDir = devkitDir;
        this.memoryDir = path.join(devkitDir, 'memory');
    }
    memoryPath(agentId) {
        return path.join(this.memoryDir, `${agentId}.md`);
    }
    async read(agentId) {
        const file = this.memoryPath(agentId);
        if (!fs.existsSync(file))
            return [];
        const content = fs.readFileSync(file, 'utf-8');
        const entries = [];
        const blocks = content.split(/\n(?=### )/);
        for (const block of blocks) {
            const lines = block.split('\n');
            const header = lines[0];
            if (!header || !header.startsWith('### '))
                continue;
            const metaMatch = header.match(/###\s+\[(\w+)\]\s+(.+)/);
            if (!metaMatch)
                continue;
            const category = metaMatch[1];
            const title = metaMatch[2];
            const body = lines.slice(1).join('\n').trim();
            const timestampMatch = body.match(/- Timestamp:\s*(.+)/);
            const sourceMatch = body.match(/- Source:\s*(.+)/);
            entries.push({
                category,
                content: `${title}\n${body}`,
                timestamp: timestampMatch?.[1] || '',
                source: sourceMatch?.[1] || 'unknown',
            });
        }
        return entries;
    }
    async readByCategory(agentId, category) {
        const all = await this.read(agentId);
        return all.filter(e => e.category === category);
    }
    async append(agentId, category, content, source = 'auto') {
        (0, path_1.ensureDir)(this.memoryDir);
        const file = this.memoryPath(agentId);
        const existing = await this.read(agentId);
        const hash = this.shortHash(content);
        const duplicate = existing.some(e => e.category === category && this.shortHash(e.content) === hash);
        if (duplicate)
            return;
        const timestamp = new Date().toISOString();
        const block = [
            '',
            `### [${category}] ${content.split('\n')[0].slice(0, 60)}`,
            content,
            `- Timestamp: ${timestamp}`,
            `- Source: ${source}`,
        ].join('\n');
        if (fs.existsSync(file)) {
            fs.appendFileSync(file, block + '\n', 'utf-8');
        }
        else {
            fs.writeFileSync(file, `# ${agentId} Memory\n${block}\n`, 'utf-8');
        }
    }
    async rememberDecision(agentId, decision) {
        await this.append(agentId, 'decision', decision, 'manual');
    }
    async rememberConvention(agentId, convention) {
        await this.append(agentId, 'convention', convention, 'auto');
    }
    async rememberFix(agentId, fix) {
        await this.append(agentId, 'fix', fix, 'reflector');
    }
    async clear(agentId) {
        const file = this.memoryPath(agentId);
        if (fs.existsSync(file))
            fs.unlinkSync(file);
    }
    shortHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return String(hash);
    }
}
exports.AgentMemory = AgentMemory;
//# sourceMappingURL=index.js.map