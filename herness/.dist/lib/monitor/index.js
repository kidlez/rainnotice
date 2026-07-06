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
exports.SessionMonitor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ALL_AGENTS = [
    'planner', 'designer', 'developer', 'validator', 'reflector',
];
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
function statusIcon(status) {
    switch (status) {
        case 'completed': return '✓';
        case 'failed': return '✗';
        case 'aborted': return '⊘';
        case 'running': return '⟳';
        default: return '○';
    }
}
class SessionMonitor {
    devkitDir;
    constructor(devkitDir) {
        this.devkitDir = devkitDir;
    }
    getProgress() {
        const contextDir = path.join(this.devkitDir, 'context');
        const progress = [];
        for (const agentId of ALL_AGENTS) {
            const agentContextDir = path.join(contextDir, agentId);
            const p = {
                agentId,
                status: 'idle',
                durationMs: 0,
                checks: {},
                subAgents: [],
            };
            if (fs.existsSync(agentContextDir)) {
                const files = fs.readdirSync(agentContextDir).filter(f => f.endsWith('.json'));
                if (files.length > 0) {
                    const latest = files[files.length - 1];
                    const stat = fs.statSync(path.join(agentContextDir, latest));
                    try {
                        const data = JSON.parse(fs.readFileSync(path.join(agentContextDir, latest), 'utf-8'));
                        p.status = data.status || 'completed';
                        p.startedAt = data.startedAt;
                        p.completedAt = data.completedAt;
                        p.durationMs = data.durationMs || (Date.now() - stat.birthtimeMs);
                        p.checks = data.checks || {};
                        p.subAgents = data.subAgents || [];
                    }
                    catch {
                        p.status = 'completed';
                        p.durationMs = Date.now() - stat.birthtimeMs;
                    }
                }
            }
            const handoffPath = path.join(this.devkitDir, 'handoff.md');
            if (fs.existsSync(handoffPath)) {
                const content = fs.readFileSync(handoffPath, 'utf-8');
                if (content.includes(`to: ${agentId}`) && content.includes('dispatched')) {
                    if (p.status === 'idle')
                        p.status = 'running';
                }
            }
            progress.push(p);
        }
        return progress;
    }
    summary() {
        const progress = this.getProgress();
        const lines = [
            '┌─ Session Monitor ──────────────────────────────────────┐',
        ];
        for (const p of progress) {
            const icon = statusIcon(p.status);
            const name = p.agentId.padEnd(14);
            const status = p.status.padEnd(10);
            const time = formatDuration(p.durationMs);
            const checkEntries = Object.entries(p.checks);
            const checkStr = checkEntries.length > 0
                ? '  checks: ' + checkEntries.map(([k, v]) => `${k}=${v}`).join(', ')
                : '';
            lines.push(`│ ${icon} ${name} ${status} ${time.padStart(8)}${checkStr}`);
        }
        const completed = progress.filter(p => p.status === 'completed').length;
        const total = progress.length;
        lines.push('├────────────────────────────────────────────────────────┤');
        lines.push(`│ Total: ${completed}/${total} completed                         │`);
        lines.push('└────────────────────────────────────────────────────────┘');
        return lines.join('\n');
    }
    watch(intervalMs = 2000) {
        let running = true;
        const tick = () => {
            if (!running)
                return;
            console.clear();
            console.log(this.summary());
            if (running)
                setTimeout(tick, intervalMs);
        };
        tick();
        return () => { running = false; };
    }
}
exports.SessionMonitor = SessionMonitor;
//# sourceMappingURL=index.js.map