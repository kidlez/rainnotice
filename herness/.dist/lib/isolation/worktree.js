"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorktreeManager = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
class WorktreeManager {
    worktreesDir;
    repoRoot;
    manifests;
    constructor(repoRoot = '.') {
        this.repoRoot = this.findGitRoot(repoRoot);
        this.worktreesDir = (0, path_1.join)(this.repoRoot, '.herness-worktrees');
        this.manifests = new Map();
        this.loadManifests();
    }
    getRepoRoot() {
        return this.repoRoot;
    }
    async create(agentId, featureName, baseBranch) {
        if (!(0, fs_1.existsSync)(this.worktreesDir)) {
            (0, fs_1.mkdirSync)(this.worktreesDir, { recursive: true });
        }
        const actualBase = baseBranch || this.currentBranch();
        const id = `${agentId}-${featureName}-${Date.now().toString(36)}`;
        const branch = `herness/${agentId}/${featureName}-${Date.now().toString(36)}`;
        const worktreePath = (0, path_1.join)(this.worktreesDir, id);
        try {
            (0, child_process_1.execSync)(`git worktree add "${worktreePath}" -b ${branch} ${actualBase}`, {
                cwd: this.repoRoot,
                stdio: 'pipe',
                timeout: 30000,
            });
        }
        catch (e) {
            const err = e;
            const msg = (err.stderr || '').toString();
            if (msg.includes('already exists') || msg.includes('already checked out')) {
                throw new Error(`Worktree exists: ${msg.slice(0, 80)}`);
            }
            throw new Error(`Failed to create worktree: ${msg.slice(0, 120)}`);
        }
        const state = {
            id,
            agentId,
            featureName,
            branch,
            worktreePath: (0, path_1.resolve)(worktreePath),
            baseBranch: actualBase,
            createdAt: new Date().toISOString(),
            status: 'active',
        };
        this.manifests.set(id, state);
        this.saveManifest(state);
        return state;
    }
    async merge(state) {
        try {
            const currentBranch = this.currentBranch();
            (0, child_process_1.execSync)(`git merge ${state.branch} --no-edit`, {
                cwd: this.repoRoot,
                stdio: 'pipe',
                timeout: 30000,
            });
            state.status = 'merged';
            this.saveManifest(state);
            return true;
        }
        catch (e) {
            const err = e;
            const msg = (err.stderr || '').toString();
            if (msg.includes('CONFLICT')) {
                try {
                    (0, child_process_1.execSync)(`git merge --abort`, { cwd: this.repoRoot, stdio: 'pipe', timeout: 10000 });
                }
                catch {
                    // best effort
                }
            }
            return false;
        }
    }
    async cleanup(state) {
        try {
            (0, child_process_1.execSync)(`git worktree remove "${state.worktreePath}" --force`, {
                cwd: this.repoRoot,
                stdio: 'pipe',
                timeout: 15000,
            });
            try {
                (0, child_process_1.execSync)(`git branch -D ${state.branch}`, {
                    cwd: this.repoRoot,
                    stdio: 'pipe',
                    timeout: 10000,
                });
            }
            catch {
                // branch may not exist
            }
            state.status = 'cleaned';
            this.saveManifest(state);
            return true;
        }
        catch (e) {
            const err = e;
            const msg = (err.stderr || '').toString();
            if (msg.includes('is not a working tree')) {
                state.status = 'cleaned';
                this.saveManifest(state);
                return true;
            }
            return false;
        }
    }
    async list() {
        return [...this.manifests.values()];
    }
    async listActive() {
        return [...this.manifests.values()].filter((s) => s.status === 'active');
    }
    async listForFeature(featureName) {
        return [...this.manifests.values()].filter((s) => s.featureName === featureName);
    }
    async createIsolatedAgent(agentId, featureName, fn) {
        const state = await this.create(agentId, featureName);
        const success = await fn(state.worktreePath);
        if (success) {
            await this.merge(state);
        }
        await this.cleanup(state);
        return { success, state };
    }
    findGitRoot(cwd) {
        try {
            const result = (0, child_process_1.execSync)('git rev-parse --show-toplevel', {
                cwd,
                stdio: 'pipe',
                timeout: 5000,
            });
            return result.toString().trim();
        }
        catch {
            throw new Error(`Not a git repository: ${cwd}`);
        }
    }
    currentBranch() {
        try {
            const result = (0, child_process_1.execSync)('git rev-parse --abbrev-ref HEAD', {
                cwd: this.repoRoot,
                stdio: 'pipe',
                timeout: 5000,
            });
            return result.toString().trim();
        }
        catch {
            return 'main';
        }
    }
    manifestPath(id) {
        return (0, path_1.join)(this.worktreesDir, `${id}.json`);
    }
    saveManifest(state) {
        const p = this.manifestPath(state.id);
        (0, fs_1.writeFileSync)(p, JSON.stringify(state, null, 2), 'utf-8');
    }
    loadManifests() {
        if (!(0, fs_1.existsSync)(this.worktreesDir))
            return;
        try {
            const { readdirSync } = require('fs');
            for (const file of readdirSync(this.worktreesDir)) {
                if (!file.endsWith('.json'))
                    continue;
                try {
                    const manifest = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(this.worktreesDir, file), 'utf-8'));
                    this.manifests.set(manifest.id, manifest);
                }
                catch {
                    // skip invalid
                }
            }
        }
        catch {
            // dir may not exist
        }
    }
}
exports.WorktreeManager = WorktreeManager;
//# sourceMappingURL=worktree.js.map