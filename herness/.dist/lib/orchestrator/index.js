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
exports.Orchestrator = void 0;
const store_1 = require("../store");
const path_1 = require("../../shared/utils/path");
const guard_1 = require("../guard");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const FLOW = ['planner', 'designer', 'developer', 'validator'];
function parseFeatureMeta(content) {
    const nameMatch = content.match(/^#\s+Feature:\s+(.+)/m);
    const statusMatch = content.match(/-\s*\S*\s*状态:\s*(\S+)/);
    return {
        name: nameMatch?.[1] ?? 'unknown',
        status: statusMatch?.[1] ?? 'unknown',
    };
}
function parseTasks(content) {
    const tasks = [];
    const regex = /-\s+\[([ x])\]\s+(TASK-\S+):/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
        tasks.push({ id: m[2], done: m[1] === 'x' });
    }
    return tasks;
}
class Orchestrator {
    config;
    handoffStore;
    contextStore;
    guard;
    constructor(config) {
        this.config = config;
        const devkitPath = path.resolve(config.rootDir, config.devkitDir);
        this.handoffStore = new store_1.HandoffStore(devkitPath);
        this.contextStore = new store_1.ContextStore(devkitPath);
        const permissions = guard_1.Guard.createDefaults(config.rootDir, config.devkitDir);
        this.guard = new guard_1.Guard(permissions);
    }
    getGuard() {
        return this.guard;
    }
    async start() {
        try {
            const existing = await this.handoffStore.read();
            if (existing && existing.status !== 'completed') {
                await this.resume(existing);
            }
            else {
                await this.runFlow('main');
            }
            await this.generateReport();
            const reportDir = path.resolve(this.config.rootDir, this.config.devkitDir);
            const guardReport = this.guard.report();
            if (!guardReport.allClean) {
                const violationLines = guardReport.violations.map(v => `[${v.agentId}] ${v.operation} on "${v.target}": ${v.reason}`);
                const guardLog = `# Guard Violations\n\n${violationLines.map(l => `- ${l}`).join('\n')}\n`;
                fs.writeFileSync(path.join(reportDir, 'guard-report.md'), guardLog, 'utf-8');
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await this.handoffStore.write({
                from: 'orchestrator',
                to: 'orchestrator',
                timestamp: new Date().toISOString(),
                status: 'failed',
                task_id: '',
                feature_id: '',
                payload: {},
                error: message,
            });
        }
    }
    async runFlow(taskId) {
        for (const agent of FLOW) {
            await this.dispatch(agent, taskId);
            const result = await this.waitFor(agent);
            if (result.status === 'failed') {
                return;
            }
        }
    }
    async resume(state) {
        const idx = FLOW.indexOf(state.to);
        if (idx === -1)
            return;
        const startIdx = state.status === 'completed' ? idx + 1 : idx;
        for (let i = startIdx; i < FLOW.length; i++) {
            await this.dispatch(FLOW[i], state.task_id);
            const result = await this.waitFor(FLOW[i]);
            if (result.status === 'failed') {
                return;
            }
        }
    }
    async dispatch(agentId, taskId) {
        await this.handoffStore.write({
            from: 'orchestrator',
            to: agentId,
            timestamp: new Date().toISOString(),
            status: 'dispatched',
            task_id: taskId,
            feature_id: '',
            payload: {},
        });
    }
    async waitFor(agentId) {
        while (true) {
            const state = await this.handoffStore.read();
            if (!state) {
                throw new Error(`No handoff state found for agent ${agentId}`);
            }
            if (state.to !== agentId) {
                throw new Error(`Expected handoff for ${agentId}, got ${state.to}`);
            }
            if (state.status === 'completed' || state.status === 'failed') {
                return state;
            }
            await new Promise(r => setTimeout(r, 500));
        }
    }
    async getProgress() {
        const completed = [];
        const pending = [];
        for (const agent of FLOW) {
            try {
                const ctx = await this.contextStore.read(agent);
                if (ctx) {
                    completed.push(agent);
                }
                else {
                    pending.push(agent);
                }
            }
            catch {
                pending.push(agent);
            }
        }
        const current = pending.length > 0 ? pending[0] : 'completed';
        return { current, completed, pending };
    }
    async generateReport() {
        const reportDir = path.resolve(this.config.rootDir, this.config.devkitDir);
        (0, path_1.ensureDir)(reportDir);
        const lines = [
            '# Feature Development Report',
            '',
            `**Generated:** ${new Date().toISOString()}`,
            '',
            '---',
            '',
            '## Feature Status',
            '',
        ];
        for (const featurePath of this.config.features) {
            const fullPath = path.resolve(this.config.rootDir, featurePath);
            try {
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const meta = parseFeatureMeta(content);
                    lines.push(`- **${meta.name}** — status: \`${meta.status}\``);
                }
                else {
                    lines.push(`- ${featurePath} — *file not found*`);
                }
            }
            catch {
                lines.push(`- ${featurePath} — *error reading*`);
            }
        }
        lines.push('', '---', '', '## Agent Progress', '');
        lines.push('| Agent | Status |');
        lines.push('|-------|--------|');
        const { current, completed, pending } = await this.getProgress();
        for (const agent of FLOW) {
            if (completed.includes(agent)) {
                lines.push(`| ${agent} | ✅ completed |`);
            }
            else if (agent === current) {
                lines.push(`| ${agent} | 🔄 in progress |`);
            }
            else {
                lines.push(`| ${agent} | ⏳ pending |`);
            }
        }
        lines.push('', '---', '', '## Task Completion', '');
        for (const featurePath of this.config.features) {
            const fullPath = path.resolve(this.config.rootDir, featurePath);
            try {
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const meta = parseFeatureMeta(content);
                    const tasks = parseTasks(content);
                    if (tasks.length > 0) {
                        lines.push(`### ${meta.name}`, '');
                        lines.push('| Task | Status |');
                        lines.push('|------|--------|');
                        for (const t of tasks) {
                            lines.push(`| ${t.id} | ${t.done ? '✅ done' : '⬜ pending'} |`);
                        }
                        lines.push('');
                    }
                }
            }
            catch {
                // skip
            }
        }
        const blockers = pending.filter(a => !completed.includes(a));
        if (blockers.length > 0) {
            lines.push('---', '', '## Blockers', '');
            for (const agent of blockers) {
                lines.push(`- Agent **${agent}** has not yet completed`);
            }
        }
        lines.push('');
        const report = lines.join('\n');
        this.guard.assertWrite('orchestrator', path.join(reportDir, 'report.md'));
        fs.writeFileSync(path.join(reportDir, 'report.md'), report, 'utf-8');
        return report;
    }
}
exports.Orchestrator = Orchestrator;
//# sourceMappingURL=index.js.map