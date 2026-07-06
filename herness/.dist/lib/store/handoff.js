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
exports.HandoffStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const path_1 = require("../../shared/utils/path");
class HandoffStore {
    devkitDir;
    constructor(devkitDir) {
        this.devkitDir = devkitDir;
    }
    async write(state) {
        (0, path_1.ensureDir)(this.devkitDir);
        const filePath = path.join(this.devkitDir, 'handoff.md');
        fs.writeFileSync(filePath, this.serialize(state), 'utf-8');
    }
    async read() {
        const filePath = path.join(this.devkitDir, 'handoff.md');
        if (!fs.existsSync(filePath))
            return null;
        return this.deserialize(fs.readFileSync(filePath, 'utf-8'));
    }
    async clear() {
        const filePath = path.join(this.devkitDir, 'handoff.md');
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    serialize(state) {
        const lines = [];
        for (const [key, value] of Object.entries(state)) {
            if (value === undefined)
                continue;
            if (typeof value === 'object' && value !== null) {
                lines.push(`${key}: ${JSON.stringify(value)}`);
            }
            else {
                lines.push(`${key}: "${String(value)}"`);
            }
        }
        return lines.join('\n') + '\n';
    }
    deserialize(content) {
        const state = {};
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.includes(':'))
                continue;
            const sep = trimmed.indexOf(':');
            const key = trimmed.slice(0, sep).trim();
            const raw = trimmed.slice(sep + 1).trim();
            if (!key)
                continue;
            if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
                try {
                    state[key] = JSON.parse(raw);
                }
                catch {
                    state[key] = raw;
                }
            }
            else if (raw.startsWith('"') && raw.endsWith('"')) {
                state[key] = raw.slice(1, -1);
            }
            else if (raw.startsWith("'") && raw.endsWith("'")) {
                state[key] = raw.slice(1, -1);
            }
            else {
                state[key] = raw;
            }
        }
        return state;
    }
}
exports.HandoffStore = HandoffStore;
//# sourceMappingURL=handoff.js.map