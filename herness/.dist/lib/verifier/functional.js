"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionalVerifier = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
function runCommand(cwd, cmd, args) {
    try {
        const result = (0, child_process_1.execSync)(`${cmd} ${args.join(' ')}`, { cwd, stdio: 'pipe', timeout: 120000 });
        return { ok: true, output: result.toString() };
    }
    catch (e) {
        const err = e;
        return { ok: false, output: (err.stderr || err.stdout || '').toString().slice(0, 1000) };
    }
}
function detectTestRunner(cwd) {
    if ((0, fs_1.existsSync)((0, path_1.join)(cwd, 'vitest.config.ts')) || (0, fs_1.existsSync)((0, path_1.join)(cwd, 'vitest.config.js')))
        return 'vitest';
    if ((0, fs_1.existsSync)((0, path_1.join)(cwd, 'jest.config.ts')) || (0, fs_1.existsSync)((0, path_1.join)(cwd, 'jest.config.js')))
        return 'jest';
    return null;
}
class FunctionalVerifier {
    featuresDir;
    constructor(featuresDir) {
        this.featuresDir = featuresDir;
    }
    async verify(task, signal) {
        const start = Date.now();
        const checks = {};
        const failures = [];
        for (const check of task.checks) {
            if (task.tier === 'light' && !['unit_test', 'functional_test'].includes(check)) {
                checks[check] = 'skipped';
                continue;
            }
            switch (check) {
                case 'unit_test': {
                    const testFile = (0, path_1.join)(task.featurePath, '__tests__', `${task.featureName}.test.ts`);
                    if (!(0, fs_1.existsSync)(testFile)) {
                        checks[check] = 'skipped';
                        break;
                    }
                    const runner = detectTestRunner(task.featurePath);
                    if (!runner) {
                        checks[check] = 'skipped';
                        failures.push({ check, detail: 'No test runner configured', severity: 'warning' });
                        break;
                    }
                    const result = runCommand(task.featurePath, 'npx', [runner, 'run', `${task.featureName}.test`]);
                    checks[check] = result.ok ? 'passed' : 'failed';
                    if (!result.ok)
                        failures.push({ check, detail: result.output, severity: 'warning' });
                    break;
                }
                case 'functional_test': {
                    const funcFile = (0, path_1.join)(task.featurePath, '__tests__', `${task.featureName}.func.test.ts`);
                    if (!(0, fs_1.existsSync)(funcFile)) {
                        checks[check] = 'skipped';
                        break;
                    }
                    const runner = detectTestRunner(task.featurePath);
                    if (!runner) {
                        checks[check] = 'skipped';
                        failures.push({ check, detail: 'No test runner configured', severity: 'warning' });
                        break;
                    }
                    const result = runCommand(task.featurePath, 'npx', [runner, 'run', `${task.featureName}.func.test`]);
                    checks[check] = result.ok ? 'passed' : 'failed';
                    if (!result.ok)
                        failures.push({ check, detail: result.output, severity: 'warning' });
                    break;
                }
                case 'regression_test': {
                    const targets = task.testPlan?.regressionTargets || [];
                    const regFailures = [];
                    for (const target of targets) {
                        const targetDir = (0, path_1.join)(this.featuresDir, target);
                        if (!(0, fs_1.existsSync)(targetDir))
                            continue;
                        const testDir = (0, path_1.join)(targetDir, '__tests__');
                        if (!(0, fs_1.existsSync)(testDir))
                            continue;
                        const testFiles = (0, fs_1.readdirSync)(testDir).filter(f => f.endsWith('.test.ts'));
                        const runner = detectTestRunner(targetDir);
                        if (!runner)
                            continue;
                        for (const tf of testFiles) {
                            const testName = tf.replace(/\.test\.ts$/, '');
                            const result = runCommand(targetDir, 'npx', [runner, 'run', testName]);
                            if (!result.ok)
                                regFailures.push(`${target}/${testName}: ${result.output.slice(0, 200)}`);
                        }
                    }
                    checks[check] = regFailures.length === 0 ? (targets.length === 0 ? 'skipped' : 'passed') : 'failed';
                    for (const rf of regFailures)
                        failures.push({ check, detail: rf, severity: 'critical' });
                    break;
                }
                case 'ac_coverage': {
                    const testPlan = task.testPlan;
                    if (!testPlan) {
                        checks[check] = 'skipped';
                        break;
                    }
                    const funcTests = testPlan.functionalTests.length;
                    const totalAC = task.designArtifacts?.interview?.featureContent
                        ? (task.designArtifacts.interview.featureContent.match(/-\s*\[.?\]\s/g) || []).length
                        : 0;
                    if (funcTests === 0) {
                        checks[check] = 'skipped';
                        failures.push({ check, detail: 'No functional test cases in TestPlan', severity: 'warning' });
                        break;
                    }
                    if (totalAC === 0) {
                        checks[check] = 'skipped';
                        break;
                    }
                    checks[check] = funcTests >= totalAC ? 'passed' : 'failed';
                    if (funcTests < totalAC)
                        failures.push({ check, detail: `Only ${funcTests}/${totalAC} ACs have test cases`, severity: 'warning' });
                    break;
                }
                default: {
                    checks[check] = 'skipped';
                    break;
                }
            }
            if (signal?.aborted) {
                return {
                    type: 'functional',
                    passed: false,
                    severity: 'warning',
                    checks,
                    failures: [...failures, { check: '(aborted)', detail: 'Circuit breaker tripped', severity: 'warning' }],
                    durationMs: Date.now() - start,
                    aborted: true,
                };
            }
        }
        const allOk = Object.values(checks).every(r => r === 'passed' || r === 'skipped');
        const severity = failures.some(f => f.severity === 'critical') ? 'critical' :
            failures.length > 0 ? 'warning' : 'info';
        return {
            type: 'functional',
            passed: allOk,
            severity,
            checks,
            failures,
            durationMs: Date.now() - start,
            aborted: false,
        };
    }
}
exports.FunctionalVerifier = FunctionalVerifier;
//# sourceMappingURL=functional.js.map