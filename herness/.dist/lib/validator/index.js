"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const functional_1 = require("../verifier/functional");
const standards_1 = require("../verifier/standards");
const security_1 = require("../verifier/security");
const TIER_CHECKS = {
    light: {
        functional: ['unit_test', 'functional_test'],
        standards: ['compile', 'typecheck', 'code_style'],
        security: [],
    },
    standard: {
        functional: ['unit_test', 'functional_test', 'regression_test', 'ac_coverage'],
        standards: ['compile', 'typecheck', 'lint', 'design_coverage', 'code_style'],
        security: ['secret_scan', 'dependency_audit', 'injection_check', 'permission_check'],
    },
    deep: {
        functional: ['unit_test', 'functional_test', 'regression_test', 'ac_coverage'],
        standards: ['compile', 'typecheck', 'lint', 'design_coverage', 'code_style'],
        security: ['secret_scan', 'dependency_audit', 'injection_check', 'permission_check'],
    },
};
class Validator {
    featuresDir;
    guard;
    functionalVerifier;
    standardsVerifier;
    securityVerifier;
    checkpointMgr = null;
    breaker = {
        tripped: false,
        tripReason: '',
        trippedAt: '',
        failureCount: 0,
        threshold: 3,
        resetAfterMs: 300000,
    };
    constructor(featuresDir, guard, checkpointMgr) {
        this.featuresDir = featuresDir;
        this.guard = guard;
        this.functionalVerifier = new functional_1.FunctionalVerifier(featuresDir);
        this.standardsVerifier = new standards_1.StandardsVerifier(featuresDir);
        this.securityVerifier = new security_1.SecurityVerifier(featuresDir);
        if (checkpointMgr)
            this.checkpointMgr = checkpointMgr;
    }
    async validate(featureName, testPlan, designArtifacts, tier = 'standard') {
        if (this.breaker.tripped) {
            const elapsed = Date.now() - new Date(this.breaker.trippedAt).getTime();
            if (elapsed < this.breaker.resetAfterMs) {
                throw new Error(`Circuit breaker tripped: ${this.breaker.tripReason}. Reset in ${Math.ceil((this.breaker.resetAfterMs - elapsed) / 1000)}s`);
            }
            this.breaker.tripped = false;
            this.breaker.failureCount = 0;
        }
        const featurePath = (0, path_1.join)(this.featuresDir, featureName);
        const start = Date.now();
        const abortController = new AbortController();
        const tasks = [
            {
                id: 'functional',
                type: 'functional',
                tier,
                checks: TIER_CHECKS[tier].functional,
                featureName,
                featurePath,
                designArtifacts,
                testPlan,
            },
            {
                id: 'standards',
                type: 'standards',
                tier,
                checks: TIER_CHECKS[tier].standards,
                featureName,
                featurePath,
                designArtifacts,
                testPlan,
            },
            {
                id: 'security',
                type: 'security',
                tier,
                checks: TIER_CHECKS[tier].security,
                featureName,
                featurePath,
            },
        ];
        const results = await Promise.all([
            this.functionalVerifier.verify(tasks[0], abortController.signal),
            this.standardsVerifier.verify(tasks[1], abortController.signal),
            this.securityVerifier.verify(tasks[2], abortController.signal),
        ]);
        const hasCritical = results.some(r => r.severity === 'critical');
        if (hasCritical) {
            abortController.abort();
            for (let i = 0; i < results.length; i++) {
                if (results[i].severity !== 'critical' && !results[i].aborted) {
                    results[i].aborted = true;
                }
            }
            this.breaker.failureCount++;
            if (this.breaker.failureCount >= this.breaker.threshold) {
                this.breaker.tripped = true;
                this.breaker.tripReason = results
                    .filter(r => r.severity === 'critical')
                    .map(r => `${r.type}: ${r.failures.filter(f => f.severity === 'critical').map(f => f.check).join(', ')}`)
                    .join('; ');
                this.breaker.trippedAt = new Date().toISOString();
            }
            if (this.checkpointMgr) {
                const latest = await this.checkpointMgr.getLatest(featureName);
                if (latest && latest.status === 'active') {
                    try {
                        const restored = await this.checkpointMgr.rollback(latest);
                        console.error(`Auto-rollback: restored ${restored.length} files for ${featureName}`);
                    }
                    catch { }
                }
            }
        }
        else {
            this.breaker.failureCount = 0;
        }
        const regression = await this.checkRegression(featureName, testPlan?.regressionTargets || []);
        const allPassed = results.every(r => r.passed) && regression.allPassed;
        const allFailures = [];
        for (const r of results) {
            for (const f of r.failures) {
                allFailures.push({ type: r.type, check: f.check, detail: f.detail });
            }
        }
        for (const rf of regression.failures) {
            allFailures.push({ type: 'functional', check: 'regression', detail: `${rf.feature}: ${rf.detail}` });
        }
        const summaryParts = [];
        for (const r of results) {
            const failedCount = Object.values(r.checks).filter(v => v === 'failed').length;
            const abortedTag = r.aborted ? ' [ABORTED]' : '';
            summaryParts.push(`${r.type}${abortedTag}: ${r.passed ? 'OK' : `${failedCount} failed`}`);
        }
        if (this.breaker.tripped) {
            summaryParts.push(`BREAKER TRIPPED: ${this.breaker.tripReason}`);
        }
        summaryParts.push(`regression: ${regression.run ? (regression.allPassed ? 'OK' : 'failures') : 'skipped'}`);
        return {
            passed: allPassed,
            results,
            regression,
            circuitBreaker: { ...this.breaker },
            summary: summaryParts.join(' | '),
            totalDurationMs: Date.now() - start,
            failures: allFailures,
        };
    }
    async validateSimple(featureName, tier = 'standard') {
        const report = await this.validate(featureName, undefined, undefined, tier);
        const checks = {
            compile: 'skipped',
            typecheck: 'skipped',
            unit_test: 'skipped',
            functional_test: 'skipped',
            lint: 'skipped',
            coverage: 'skipped',
        };
        for (const r of report.results) {
            for (const [key, value] of Object.entries(r.checks)) {
                const mapped = this.mapCheckName(key);
                if (mapped)
                    checks[mapped] = value;
            }
        }
        const failures = report.failures.map(f => ({ check: f.check, detail: f.detail }));
        return {
            passed: report.passed,
            checks,
            regression: report.regression,
            summary: report.summary,
            failures,
        };
    }
    getBreakerState() {
        return { ...this.breaker };
    }
    resetBreaker() {
        this.breaker.tripped = false;
        this.breaker.failureCount = 0;
        this.breaker.tripReason = '';
    }
    async checkRegression(featureName, regressionTargets) {
        if (!regressionTargets || regressionTargets.length === 0) {
            return { run: false, featuresChecked: [], allPassed: true, failures: [] };
        }
        const failures = [];
        const checked = [];
        for (const target of regressionTargets) {
            const targetDir = (0, path_1.join)(this.featuresDir, target);
            if (!(0, fs_1.existsSync)(targetDir))
                continue;
            checked.push(target);
            const testDir = (0, path_1.join)(targetDir, '__tests__');
            if (!(0, fs_1.existsSync)(testDir))
                continue;
            try {
                const files = (0, fs_1.readdirSync)(testDir).filter(f => f.endsWith('.test.ts') || f.endsWith('.func.test.ts'));
                for (const file of files) {
                    const testName = file.replace(/\.(test|func\.test)\.ts$/, '');
                    try {
                        (0, child_process_1.execSync)(`npx vitest run ${testName} --reporter=verbose`, {
                            cwd: targetDir,
                            stdio: 'pipe',
                            timeout: 120000,
                        });
                    }
                    catch (e) {
                        const err = e;
                        failures.push({
                            feature: target,
                            detail: (err.stderr || err.stdout || '').toString().slice(0, 300),
                        });
                    }
                }
            }
            catch {
                failures.push({ feature: target, detail: 'Failed to run regression tests' });
            }
        }
        return { run: true, featuresChecked: checked, allPassed: failures.length === 0, failures };
    }
    mapCheckName(key) {
        const map = {
            compile: 'compile',
            typecheck: 'typecheck',
            lint: 'lint',
            unit_test: 'unit_test',
            functional_test: 'functional_test',
            ac_coverage: 'coverage',
        };
        return map[key] || null;
    }
}
exports.Validator = Validator;
//# sourceMappingURL=index.js.map