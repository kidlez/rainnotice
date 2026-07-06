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
exports.Pipeline = exports.TrashBin = exports.withCheckpoint = exports.CheckpointManager = exports.TraceStore = exports.ArchiveStore = exports.ContextStore = exports.HandoffStore = exports.Guard = exports.Reflector = exports.VictoryGate = exports.Validator = exports.Developer = exports.Designer = exports.Planner = exports.Orchestrator = void 0;
exports.createPipeline = createPipeline;
var orchestrator_1 = require("../orchestrator");
Object.defineProperty(exports, "Orchestrator", { enumerable: true, get: function () { return orchestrator_1.Orchestrator; } });
var planner_1 = require("../planner");
Object.defineProperty(exports, "Planner", { enumerable: true, get: function () { return planner_1.Planner; } });
var designer_1 = require("../designer");
Object.defineProperty(exports, "Designer", { enumerable: true, get: function () { return designer_1.Designer; } });
var executor_1 = require("../executor");
Object.defineProperty(exports, "Developer", { enumerable: true, get: function () { return executor_1.Developer; } });
var validator_1 = require("../validator");
Object.defineProperty(exports, "Validator", { enumerable: true, get: function () { return validator_1.Validator; } });
var victory_gate_1 = require("../victory-gate");
Object.defineProperty(exports, "VictoryGate", { enumerable: true, get: function () { return victory_gate_1.VictoryGate; } });
var reflector_1 = require("../reflector");
Object.defineProperty(exports, "Reflector", { enumerable: true, get: function () { return reflector_1.Reflector; } });
var guard_1 = require("../guard");
Object.defineProperty(exports, "Guard", { enumerable: true, get: function () { return guard_1.Guard; } });
var store_1 = require("../store");
Object.defineProperty(exports, "HandoffStore", { enumerable: true, get: function () { return store_1.HandoffStore; } });
Object.defineProperty(exports, "ContextStore", { enumerable: true, get: function () { return store_1.ContextStore; } });
Object.defineProperty(exports, "ArchiveStore", { enumerable: true, get: function () { return store_1.ArchiveStore; } });
Object.defineProperty(exports, "TraceStore", { enumerable: true, get: function () { return store_1.TraceStore; } });
var safety_1 = require("../safety");
Object.defineProperty(exports, "CheckpointManager", { enumerable: true, get: function () { return safety_1.CheckpointManager; } });
Object.defineProperty(exports, "withCheckpoint", { enumerable: true, get: function () { return safety_1.withCheckpoint; } });
Object.defineProperty(exports, "TrashBin", { enumerable: true, get: function () { return safety_1.TrashBin; } });
const planner_2 = require("../planner");
const designer_2 = require("../designer");
const validator_2 = require("../validator");
const victory_gate_2 = require("../victory-gate");
const guard_2 = require("../guard");
const safety_2 = require("../safety");
const path = __importStar(require("path"));
class Pipeline {
    featuresDir;
    devkitDir;
    guard;
    checkpointMgr;
    constructor(rootDir = '.', devkitDir = '.devkit') {
        this.featuresDir = path.join(rootDir, 'features');
        this.devkitDir = devkitDir;
        const permissions = guard_2.Guard.createDefaults(rootDir, devkitDir);
        this.guard = new guard_2.Guard(permissions);
        this.checkpointMgr = new safety_2.CheckpointManager(devkitDir);
    }
    getGuard() { return this.guard; }
    async plan(featureName) {
        const planner = new planner_2.Planner(this.featuresDir, this.guard);
        const tasks = await planner.decompose(`${featureName}.feature.md`);
        return { tasks, sorted: await planner.sortByPriority(tasks), planner };
    }
    async design(featureName, tasks) {
        const designer = new designer_2.Designer(this.featuresDir, this.guard);
        const questions = await designer.startInterview(`${featureName}.feature.md`, tasks);
        return { questions, designer };
    }
    async verify(featureName, designArtifacts, testPlan, tier = 'standard') {
        const validator = new validator_2.Validator(this.featuresDir, this.guard, this.checkpointMgr);
        return validator.validate(featureName, testPlan, designArtifacts, tier);
    }
    async gate(featureName, designArtifacts, report, testPlan) {
        const gate = new victory_gate_2.VictoryGate(this.featuresDir);
        return gate.evaluate(featureName, designArtifacts, report, testPlan);
    }
}
exports.Pipeline = Pipeline;
function createPipeline(rootDir) {
    return new Pipeline(rootDir);
}
//# sourceMappingURL=index.js.map