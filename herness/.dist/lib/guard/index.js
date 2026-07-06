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
exports.Guard = void 0;
const path = __importStar(require("path"));
const path_1 = require("../../shared/utils/path");
class Guard {
    permissions;
    violations;
    opCounts;
    constructor(permissions) {
        this.permissions = new Map();
        this.violations = [];
        this.opCounts = new Map();
        for (const p of permissions) {
            this.permissions.set(p.agentId, p);
            this.opCounts.set(p.agentId, 0);
        }
    }
    assertRead(agentId, targetPath) {
        const perm = this.getPermission(agentId);
        this.checkOpLimit(agentId, perm);
        const resolved = path.resolve(targetPath);
        for (const forbidden of perm.forbiddenPaths) {
            if ((0, path_1.isWithinDir)(resolved, path.resolve(forbidden))) {
                this.recordViolation(agentId, 'read', targetPath, `forbidden path "${forbidden}"`);
                return;
            }
        }
        for (const allowed of perm.readPaths) {
            if ((0, path_1.isWithinDir)(resolved, path.resolve(allowed))) {
                this.bump(agentId);
                return;
            }
        }
        this.recordViolation(agentId, 'read', targetPath, 'no matching read path');
    }
    assertWrite(agentId, targetPath) {
        const perm = this.getPermission(agentId);
        this.checkOpLimit(agentId, perm);
        const resolved = path.resolve(targetPath);
        for (const forbidden of perm.forbiddenPaths) {
            if ((0, path_1.isWithinDir)(resolved, path.resolve(forbidden))) {
                this.recordViolation(agentId, 'write', targetPath, `forbidden path "${forbidden}"`);
                return;
            }
        }
        for (const allowed of perm.writePaths) {
            if ((0, path_1.isWithinDir)(resolved, path.resolve(allowed))) {
                this.bump(agentId);
                return;
            }
        }
        this.recordViolation(agentId, 'write', targetPath, 'no matching write path');
    }
    assertExec(agentId) {
        const perm = this.getPermission(agentId);
        if (!perm.canExec) {
            this.recordViolation(agentId, 'exec', 'child_process', 'exec not allowed');
        }
        this.checkOpLimit(agentId, perm);
        this.bump(agentId);
    }
    assertHandoffRead(agentId) {
        const perm = this.getPermission(agentId);
        if (!perm.canReadHandoff) {
            this.recordViolation(agentId, 'handoff_read', 'handoff.md', 'handoff read not allowed');
        }
        this.checkOpLimit(agentId, perm);
        this.bump(agentId);
    }
    assertHandoffWrite(agentId) {
        const perm = this.getPermission(agentId);
        if (!perm.canWriteHandoff) {
            this.recordViolation(agentId, 'handoff_write', 'handoff.md', 'handoff write not allowed');
        }
        this.checkOpLimit(agentId, perm);
        this.bump(agentId);
    }
    getOpCount(agentId) {
        return this.opCounts.get(agentId) || 0;
    }
    getViolations() {
        return [...this.violations];
    }
    getViolationsFor(agentId) {
        return this.violations.filter((v) => v.agentId === agentId);
    }
    report() {
        const allClean = this.violations.length === 0;
        const totalOps = {};
        for (const [id, count] of this.opCounts) {
            totalOps[id] = count;
        }
        return {
            violations: [...this.violations],
            totalOps: totalOps,
            allClean,
        };
    }
    reset() {
        this.violations = [];
    }
    getPermission(agentId) {
        const perm = this.permissions.get(agentId);
        if (!perm) {
            throw new Error(`No permissions registered for agent "${agentId}"`);
        }
        return perm;
    }
    checkOpLimit(agentId, perm) {
        const count = this.opCounts.get(agentId) || 0;
        if (count >= perm.maxFileOps) {
            this.recordViolation(agentId, 'write', '(any)', `exceeded max operations (${perm.maxFileOps})`);
        }
    }
    bump(agentId) {
        this.opCounts.set(agentId, (this.opCounts.get(agentId) || 0) + 1);
    }
    recordViolation(agentId, operation, target, reason) {
        this.violations.push({
            agentId,
            operation,
            target,
            reason,
            timestamp: new Date().toISOString(),
        });
    }
    static createDefaults(rootDir, devkitDir) {
        const absRoot = path.resolve(rootDir);
        const absDevkit = path.resolve(devkitDir);
        return [
            {
                agentId: 'orchestrator',
                readPaths: [absRoot],
                writePaths: [absDevkit],
                forbiddenPaths: [],
                canReadHandoff: true,
                canWriteHandoff: true,
                maxFileOps: 500,
                canExec: false,
            },
            {
                agentId: 'planner',
                readPaths: [path.join(absRoot, 'features'), path.join(absDevkit, 'context', 'planner')],
                writePaths: [path.join(absDevkit, 'context', 'planner')],
                forbiddenPaths: [path.join(absRoot, 'lib'), path.join(absRoot, 'shared')],
                canReadHandoff: false,
                canWriteHandoff: false,
                maxFileOps: 100,
                canExec: false,
            },
            {
                agentId: 'designer',
                readPaths: [path.join(absRoot, 'features')],
                writePaths: [],
                forbiddenPaths: [path.join(absRoot, 'lib'), path.join(absRoot, 'shared')],
                canReadHandoff: false,
                canWriteHandoff: false,
                maxFileOps: 200,
                canExec: false,
            },
            {
                agentId: 'developer',
                readPaths: [path.join(absRoot, 'features')],
                writePaths: [path.join(absRoot, 'features')],
                forbiddenPaths: [
                    path.join(absRoot, 'docs'),
                    path.join(absRoot, 'lib'),
                    path.join(absRoot, 'shared'),
                    absDevkit,
                ],
                canReadHandoff: false,
                canWriteHandoff: false,
                maxFileOps: 200,
                canExec: false,
            },
            {
                agentId: 'validator',
                readPaths: [path.join(absRoot, 'features'), absDevkit],
                writePaths: [],
                forbiddenPaths: [
                    path.join(absRoot, 'lib'),
                    path.join(absRoot, 'shared'),
                ],
                canReadHandoff: false,
                canWriteHandoff: false,
                maxFileOps: 300,
                canExec: true,
            },
            {
                agentId: 'reflector',
                readPaths: [
                    path.join(absRoot, 'features'),
                    path.join(absDevkit, 'archive', 'traces'),
                ],
                writePaths: [],
                forbiddenPaths: [
                    path.join(absRoot, 'lib'),
                    path.join(absRoot, 'shared'),
                ],
                canReadHandoff: false,
                canWriteHandoff: false,
                maxFileOps: 200,
                canExec: false,
            },
            {
                agentId: 'documenter',
                readPaths: [absRoot],
                writePaths: [path.join(absRoot, 'docs')],
                forbiddenPaths: [
                    path.join(absRoot, 'lib'),
                    path.join(absRoot, 'features'),
                    path.join(absRoot, 'shared'),
                ],
                canReadHandoff: false,
                canWriteHandoff: false,
                maxFileOps: 100,
                canExec: false,
            },
            {
                agentId: 'archiver',
                readPaths: [absRoot],
                writePaths: [path.join(absDevkit, 'archive')],
                forbiddenPaths: [
                    path.join(absRoot, 'lib'),
                    path.join(absRoot, 'features'),
                    path.join(absRoot, 'docs'),
                ],
                canReadHandoff: false,
                canWriteHandoff: false,
                maxFileOps: 100,
                canExec: false,
            },
        ];
    }
}
exports.Guard = Guard;
//# sourceMappingURL=index.js.map