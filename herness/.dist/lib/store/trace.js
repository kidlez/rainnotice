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
exports.TraceStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const path_1 = require("../../shared/utils/path");
const STOPWORDS = new Set([
    'the', 'a', 'an', 'is', 'of', 'to', 'in', 'for', 'on', 'with', 'at',
    'by', 'this', 'that', 'it', 'be', 'as', 'are', 'was', 'were', 'been',
    'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'can', 'could', 'may', 'might', 'not', 'no', 'or', 'and',
    'but', 'if', 'then', 'else', 'when', 'from',
]);
class TraceStore {
    devkitDir;
    constructor(devkitDir) {
        this.devkitDir = devkitDir;
    }
    tracesDir() {
        return path.join(this.devkitDir, 'archive', 'traces');
    }
    async save(trace) {
        const dir = this.tracesDir();
        (0, path_1.ensureDir)(dir);
        const filename = `${trace.featureId}-${trace.taskId}.md`;
        const filepath = path.join(dir, filename);
        fs.writeFileSync(filepath, this.serialize(trace), 'utf-8');
        return filepath;
    }
    async load(featureId, taskId) {
        const filepath = path.join(this.tracesDir(), `${featureId}-${taskId}.md`);
        if (!fs.existsSync(filepath))
            return null;
        return this.deserialize(fs.readFileSync(filepath, 'utf-8'));
    }
    async findByFeature(featureId) {
        const dir = this.tracesDir();
        if (!fs.existsSync(dir))
            return [];
        const prefix = `${featureId}-`;
        const traces = [];
        for (const file of fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.md'))) {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8');
            const trace = this.deserialize(content);
            if (trace)
                traces.push(trace);
        }
        return traces;
    }
    async findSimilar(similarityTags, limit = 5) {
        const dir = this.tracesDir();
        if (!fs.existsSync(dir))
            return [];
        const tagSet = new Set(similarityTags);
        const scored = [];
        for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
            const content = fs.readFileSync(path.join(dir, file), 'utf-8');
            const trace = this.deserialize(content);
            if (!trace || trace.similarityTags.length === 0)
                continue;
            const traceSet = new Set(trace.similarityTags);
            const intersection = new Set([...tagSet].filter(t => traceSet.has(t)));
            const union = new Set([...tagSet, ...traceSet]);
            if (union.size === 0)
                continue;
            const score = intersection.size / union.size;
            if (score > 0) {
                scored.push({ trace, score });
            }
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit).map(s => s.trace);
    }
    async queryFixPatterns(errors) {
        const results = [];
        for (const error of errors) {
            const keywords = await this.extractKeywords(error.detail);
            const similar = await this.findSimilar(keywords, 3);
            for (const trace of similar) {
                for (const e of trace.errors) {
                    if (e.fix && !results.some(r => r.fixPattern === e.fix)) {
                        results.push({ fixPattern: e.fix, confidence: 'medium' });
                    }
                }
            }
            if (error.type) {
                const allTraces = await this.findSimilar([error.type], 3);
                for (const trace of allTraces) {
                    for (const e of trace.errors) {
                        if (e.fix && !results.some(r => r.fixPattern === e.fix)) {
                            results.push({ fixPattern: e.fix, confidence: 'low' });
                        }
                    }
                }
            }
        }
        return results;
    }
    async extractKeywords(text) {
        const words = text.toLowerCase().split(/\W+/).filter(w => w.length >= 3 && !STOPWORDS.has(w));
        const freq = new Map();
        for (const w of words) {
            freq.set(w, (freq.get(w) || 0) + 1);
        }
        return [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([w]) => w);
    }
    serialize(trace) {
        const lines = ['---'];
        const fields = [
            ['taskId', trace.taskId],
            ['featureId', trace.featureId],
            ['durationMs', trace.durationMs],
            ['timestamp', trace.timestamp],
            ['similarityTags', trace.similarityTags],
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
        lines.push('## Input');
        lines.push(trace.input);
        lines.push('');
        lines.push('## Steps');
        for (const step of trace.steps) {
            lines.push(`- ${step}`);
        }
        lines.push('');
        lines.push('## Output');
        lines.push(trace.output);
        if (trace.errors.length > 0) {
            lines.push('');
            lines.push('## Errors');
            for (const err of trace.errors) {
                lines.push(`- message: ${err.message}`);
                lines.push(`  fix: ${err.fix}`);
            }
        }
        return lines.join('\n');
    }
    deserialize(content) {
        const lines = content.split('\n');
        if (lines[0]?.trim() !== '---')
            return null;
        const endIdx = lines.indexOf('---', 1);
        if (endIdx === -1)
            return null;
        const frontmatterLines = lines.slice(1, endIdx);
        const body = lines.slice(endIdx + 1).join('\n').trim();
        const fm = {};
        for (const line of frontmatterLines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.includes(':'))
                continue;
            const sep = trimmed.indexOf(':');
            const key = trimmed.slice(0, sep).trim();
            const raw = trimmed.slice(sep + 1).trim();
            if (!key)
                continue;
            if (raw.startsWith('[') && raw.endsWith(']')) {
                fm[key] = raw.slice(1, -1).split(',').map(t => t.trim()).filter(Boolean);
            }
            else if (raw === 'true') {
                fm[key] = true;
            }
            else if (raw === 'false') {
                fm[key] = false;
            }
            else if (raw.startsWith('"') && raw.endsWith('"')) {
                fm[key] = raw.slice(1, -1);
            }
            else if (raw.startsWith("'") && raw.endsWith("'")) {
                fm[key] = raw.slice(1, -1);
            }
            else if (/^-?\d+(\.\d+)?$/.test(raw)) {
                fm[key] = parseFloat(raw);
            }
            else {
                fm[key] = raw;
            }
        }
        const sections = this.parseBodySections(body);
        return {
            taskId: fm['taskId'],
            featureId: fm['featureId'],
            input: sections.input || '',
            steps: sections.steps || [],
            errors: sections.errors || [],
            output: sections.output || '',
            durationMs: fm['durationMs'],
            timestamp: fm['timestamp'],
            similarityTags: fm['similarityTags'],
        };
    }
    parseBodySections(body) {
        const result = {};
        const parts = body.split(/\n(?=## )/);
        for (const part of parts) {
            const sectionLines = part.split('\n');
            const header = sectionLines[0].trim();
            const content = sectionLines.slice(1).join('\n').trim();
            if (header === '## Input') {
                result.input = content;
            }
            else if (header === '## Steps') {
                result.steps = content.split('\n')
                    .map(l => l.replace(/^-\s*/, '').trim())
                    .filter(Boolean);
            }
            else if (header === '## Output') {
                result.output = content;
            }
            else if (header === '## Errors') {
                result.errors = this.parseErrors(content);
            }
        }
        return result;
    }
    parseErrors(content) {
        const errors = [];
        let current = null;
        for (const line of content.split('\n')) {
            if (line.startsWith('- message:')) {
                if (current)
                    errors.push(current);
                current = { message: line.replace(/^-\s*message:\s*/, '').trim(), fix: '' };
            }
            else if (line.trim().startsWith('fix:') && current) {
                current.fix = line.replace(/^\s*fix:\s*/, '').trim();
            }
        }
        if (current)
            errors.push(current);
        return errors;
    }
}
exports.TraceStore = TraceStore;
//# sourceMappingURL=trace.js.map