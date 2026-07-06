"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityVerifier = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const SECRET_PATTERNS = [
    { name: 'API Key', regex: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"`][A-Za-z0-9_\-]{20,}['"`]/gi },
    { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/g },
    { name: 'Private Key', regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g },
    { name: 'Token', regex: /(?:token|secret|password|passwd)\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/gi },
    { name: 'JWT', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
    { name: 'Connection String', regex: /(?:mongodb|postgres|mysql|redis):\/\/[^'"`\s]+/gi },
    { name: 'GitHub Token', regex: /ghp_[A-Za-z0-9]{36}/g },
];
const INJECTION_PATTERNS = [
    { name: 'SQL Injection', regex: /(?:query|sql|execute)\s*\(\s*['"`]\s*SELECT\b.*\$\{/i, description: 'Dynamic SQL construction - possible SQL injection' },
    { name: 'XSS', regex: /innerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\(/, description: 'DOM manipulation pattern - possible XSS' },
    { name: 'Command Injection', regex: /exec\s*\(\s*['"`][^'"`]*\$\{/, description: 'Dynamic exec command - possible command injection' },
    { name: 'Eval', regex: /\beval\s*\(/, description: 'eval() usage - possible code injection' },
    { name: 'Path Traversal', regex: /\.\.\/|\.\.\\|path\.join\s*\([^)]*\.\./, description: 'Path traversal pattern detected' },
];
function walkSourceFiles(dir) {
    const results = [];
    if (!(0, fs_1.existsSync)(dir))
        return results;
    for (const entry of (0, fs_1.readdirSync)(dir, { withFileTypes: true })) {
        const full = (0, path_1.join)(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '__tests__') {
            results.push(...walkSourceFiles(full));
        }
        else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
            results.push(full);
        }
    }
    return results;
}
class SecurityVerifier {
    featuresDir;
    constructor(featuresDir) {
        this.featuresDir = featuresDir;
    }
    async verify(task, signal) {
        const start = Date.now();
        const checks = {};
        const failures = [];
        for (const check of task.checks) {
            if (task.tier === 'light') {
                checks[check] = 'skipped';
                continue;
            }
            switch (check) {
                case 'secret_scan': {
                    const findings = [];
                    const files = walkSourceFiles(task.featurePath);
                    for (const file of files) {
                        const content = (0, fs_1.readFileSync)(file, 'utf-8');
                        for (const pattern of SECRET_PATTERNS) {
                            const matches = content.match(pattern.regex);
                            if (matches) {
                                const sev = ['AWS Key', 'Private Key', 'GitHub Token'].includes(pattern.name) ? 'critical' : 'warning';
                                findings.push({
                                    detail: `${(0, path_1.basename)(file)}:${pattern.name} (${matches.length} occurrence(s))`,
                                    severity: sev,
                                });
                            }
                        }
                    }
                    checks[check] = findings.length === 0 ? 'passed' : 'failed';
                    for (const f of findings)
                        failures.push({ check, detail: f.detail, severity: f.severity });
                    break;
                }
                case 'dependency_audit': {
                    const pkgJson = (0, path_1.join)(task.featurePath, 'package.json');
                    if (!(0, fs_1.existsSync)(pkgJson)) {
                        checks[check] = 'skipped';
                        break;
                    }
                    try {
                        const pkg = JSON.parse((0, fs_1.readFileSync)(pkgJson, 'utf-8'));
                        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                        const knownBad = [];
                        for (const [name, version] of Object.entries(deps)) {
                            const v = String(version);
                            if (v.startsWith('file:') || v.startsWith('link:')) {
                                knownBad.push({ name, reason: `local/link dependency: ${v}` });
                            }
                        }
                        checks[check] = knownBad.length === 0 ? 'passed' : 'failed';
                        for (const kb of knownBad)
                            failures.push({ check, detail: `${kb.name}: ${kb.reason}`, severity: 'warning' });
                    }
                    catch {
                        checks[check] = 'failed';
                        failures.push({ check, detail: 'Failed to parse package.json', severity: 'warning' });
                    }
                    break;
                }
                case 'injection_check': {
                    const findings = [];
                    const files = walkSourceFiles(task.featurePath);
                    for (const file of files) {
                        const content = (0, fs_1.readFileSync)(file, 'utf-8');
                        for (const pattern of INJECTION_PATTERNS) {
                            if (pattern.regex.test(content)) {
                                findings.push(`${(0, path_1.basename)(file)}: ${pattern.description}`);
                            }
                        }
                    }
                    checks[check] = findings.length === 0 ? 'passed' : 'failed';
                    for (const f of findings)
                        failures.push({ check, detail: f, severity: 'critical' });
                    break;
                }
                case 'permission_check': {
                    const issues = [];
                    const files = walkSourceFiles(task.featurePath);
                    for (const file of files) {
                        const content = (0, fs_1.readFileSync)(file, 'utf-8');
                        if (content.includes('process.env') && !content.includes('NODE_ENV') && !content.includes('process.env.NODE_ENV')) {
                            const matches = content.match(/process\.env\.(\w+)/g);
                            if (matches) {
                                const vars = [...new Set(matches.map(m => m.replace('process.env.', '')))];
                                issues.push(`${(0, path_1.basename)(file)}: reads env vars: ${vars.join(', ')}`);
                            }
                        }
                        if (/\b0o777\b/.test(content)) {
                            issues.push(`${(0, path_1.basename)(file)}: world-writable permission (0777)`);
                        }
                    }
                    checks[check] = issues.length === 0 ? 'passed' : 'failed';
                    for (const i of issues)
                        failures.push({ check, detail: i, severity: 'warning' });
                    break;
                }
                default: {
                    checks[check] = 'skipped';
                    break;
                }
            }
            if (signal?.aborted) {
                return {
                    type: 'security',
                    passed: false,
                    severity: 'critical',
                    checks,
                    failures: [...failures, { check: '(aborted)', detail: 'Circuit breaker tripped', severity: 'critical' }],
                    durationMs: Date.now() - start,
                    aborted: true,
                };
            }
        }
        const allOk = Object.values(checks).every(r => r === 'passed' || r === 'skipped');
        const severity = failures.some(f => f.severity === 'critical') ? 'critical' :
            failures.length > 0 ? 'warning' : 'info';
        return {
            type: 'security',
            passed: allOk,
            severity,
            checks,
            failures,
            durationMs: Date.now() - start,
            aborted: false,
        };
    }
}
exports.SecurityVerifier = SecurityVerifier;
//# sourceMappingURL=security.js.map