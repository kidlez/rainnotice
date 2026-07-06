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
exports.ContextStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const path_1 = require("../../shared/utils/path");
class ContextStore {
    devkitDir;
    constructor(devkitDir) {
        this.devkitDir = devkitDir;
    }
    agentDir(agentId) {
        return path.join(this.devkitDir, 'context', agentId);
    }
    async save(agentId, key, data) {
        const dir = this.agentDir(agentId);
        (0, path_1.ensureDir)(dir);
        fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(data, null, 2), 'utf-8');
    }
    async load(agentId, key) {
        const filePath = path.join(this.agentDir(agentId), `${key}.json`);
        if (!fs.existsSync(filePath))
            return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    async list(agentId) {
        const dir = this.agentDir(agentId);
        if (!fs.existsSync(dir))
            return [];
        return fs.readdirSync(dir)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace(/\.json$/, ''));
    }
    async read(agentId) {
        const keys = await this.list(agentId);
        if (keys.length === 0)
            return null;
        return this.load(agentId, keys[0]);
    }
}
exports.ContextStore = ContextStore;
//# sourceMappingURL=context.js.map