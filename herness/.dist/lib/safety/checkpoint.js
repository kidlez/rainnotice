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
exports.CheckpointManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const path_1 = require("../../shared/utils/path");
class CheckpointManager {
    devkitDir;
    constructor(devkitDir) {
        this.devkitDir = devkitDir;
    }
    checkpointDir() {
        return path.join(this.devkitDir, 'checkpoints');
    }
    async create(agentId, operation, featureName, filePaths) {
        const id = `CP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const snapshotDir = path.join(this.checkpointDir(), id);
        (0, path_1.ensureDir)(snapshotDir);
        const files = [];
        for (const fp of filePaths) {
            if (!fs.existsSync(fp))
                continue;
            const content = fs.readFileSync(fp);
            const size = content.length;
            const hash = this.hash(content);
            const relativeName = hash.slice(0, 8) + '-' + path.basename(fp);
            const snapshotPath = path.join(snapshotDir, relativeName);
            fs.writeFileSync(snapshotPath, content);
            files.push({
                originalPath: path.resolve(fp),
                snapshotPath: path.resolve(snapshotPath),
                size,
            });
        }
        const checkpoint = {
            id,
            timestamp: new Date().toISOString(),
            agentId,
            operation,
            featureName,
            files,
            status: 'active',
        };
        fs.writeFileSync(path.join(snapshotDir, 'manifest.json'), JSON.stringify(checkpoint, null, 2), 'utf-8');
        return checkpoint;
    }
    async rollback(checkpoint) {
        const restored = [];
        for (const file of checkpoint.files) {
            if (!fs.existsSync(file.snapshotPath))
                continue;
            const content = fs.readFileSync(file.snapshotPath);
            const dir = path.dirname(file.originalPath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(file.originalPath, content);
            restored.push(file.originalPath);
        }
        checkpoint.status = 'rolled_back';
        const manifestPath = path.join(this.checkpointDir(), checkpoint.id, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            fs.writeFileSync(manifestPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
        }
        return restored;
    }
    async commit(checkpoint) {
        checkpoint.status = 'committed';
        const manifestPath = path.join(this.checkpointDir(), checkpoint.id, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            fs.writeFileSync(manifestPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
        }
    }
    async list() {
        const dir = this.checkpointDir();
        if (!fs.existsSync(dir))
            return [];
        const checkpoints = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isDirectory())
                continue;
            const manifestPath = path.join(dir, entry.name, 'manifest.json');
            if (!fs.existsSync(manifestPath))
                continue;
            try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                checkpoints.push(manifest);
            }
            catch {
                // skip invalid
            }
        }
        return checkpoints.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    async findForFeature(featureName) {
        const all = await this.list();
        return all.filter((c) => c.featureName === featureName);
    }
    async getLatest(featureName) {
        const featureCheckpoints = await this.findForFeature(featureName);
        return featureCheckpoints.length > 0 ? featureCheckpoints[0] : null;
    }
    hash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}
exports.CheckpointManager = CheckpointManager;
//# sourceMappingURL=checkpoint.js.map