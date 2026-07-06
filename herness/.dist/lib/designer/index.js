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
exports.Designer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CATEGORIES = [
    { id: 'scope', label: '功能边界', critical: true },
    { id: 'data_model', label: '数据模型', critical: true },
    { id: 'interface', label: '接口契约', critical: true },
    { id: 'user_flow', label: '用户流程', critical: true },
    { id: 'edge_cases', label: '边界情况', critical: true },
    { id: 'non_functional', label: '非功能需求', critical: false },
    { id: 'constraints', label: '技术约束', critical: false },
    { id: 'integration', label: '集成依赖', critical: false },
];
const CATEGORY_TRIGGERS = {
    scope: ['功能', '做什么', '不做什么', '范围', '边界', '包含', '排除', '职责'],
    data_model: ['数据', '字段', '实体', '关系', '存储', '模型', '属性', '结构', '类型'],
    interface: ['接口', 'API', '输入', '输出', '参数', '返回值', '错误码', 'HTTP', 'REST', '方法'],
    user_flow: ['用户', '点击', '页面', '步骤', '流程', '操作', '交互', '跳转', '登录', '注册'],
    edge_cases: ['异常', '错误', '边界', '空', '并发', '超时', '失败', '重试', '兜底'],
    non_functional: ['性能', '安全', '并发量', '响应时间', '可用性', '兼容', '权限', '加密'],
    constraints: ['框架', '语言', '版本', '依赖', '限制', '约束', '必须', '不允许'],
    integration: ['第三方', '外部', '对接', '调用', 'SDK', 'API', '协议', '格式', '数据库'],
};
class Designer {
    featuresDir;
    guard;
    interview;
    agentId = 'designer';
    constructor(featuresDir, guard) {
        this.featuresDir = featuresDir;
        this.guard = guard;
    }
    async startInterview(featurePath, tasks) {
        const fullPath = path.resolve(this.featuresDir, featurePath);
        if (this.guard)
            this.guard.assertRead(this.agentId, fullPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const featureName = path.basename(featurePath, path.extname(featurePath));
        const questions = this.generateInitialQuestions(featureName, content, tasks);
        this.interview = {
            featureName,
            featureContent: content,
            tasks,
            questions,
            currentRound: 1,
            startedAt: new Date().toISOString(),
        };
        return this.getOpenQuestions();
    }
    getOpenQuestions() {
        if (!this.interview)
            return [];
        return this.interview.questions.filter((q) => !q.resolved);
    }
    getResolvedQuestions() {
        if (!this.interview)
            return [];
        return this.interview.questions.filter((q) => q.resolved);
    }
    getQuestionsByCategory(category) {
        if (!this.interview)
            return [];
        return this.interview.questions.filter((q) => q.category === category);
    }
    answerQuestion(questionId, answer) {
        if (!this.interview)
            return [];
        const q = this.interview.questions.find((q) => q.id === questionId);
        if (!q)
            return [];
        q.answer = answer;
        q.resolved = true;
        if (!q.followUpGenerated) {
            q.followUpGenerated = true;
            const followUps = this.generateFollowUpQuestions(q, answer);
            this.interview.questions.push(...followUps);
        }
        return this.getOpenQuestions();
    }
    isReadyToFinalize() {
        if (!this.interview)
            return { ready: false, missingCategories: [] };
        const missing = [];
        for (const cat of CATEGORIES) {
            if (!cat.critical)
                continue;
            const resolved = this.interview.questions.filter((q) => q.category === cat.id && q.resolved);
            if (resolved.length === 0) {
                missing.push(cat.label);
            }
        }
        return { ready: missing.length === 0, missingCategories: missing };
    }
    async finalize() {
        if (!this.interview) {
            throw new Error('No interview started. Call startInterview() first.');
        }
        this.interview.completedAt = new Date().toISOString();
        const acceptanceCriteria = this.parseAcceptanceCriteria(this.interview.featureContent);
        const testPlan = this.generateTestPlan(acceptanceCriteria, this.interview.featureContent);
        const types = this.generateTypesFromAnswers();
        const modules = this.extractModulesFromAnswers();
        const interfaces = this.extractInterfacesFromAnswers();
        const edgeCases = this.collectEdgeCases();
        const designDoc = this.buildDesignDoc(types, modules, interfaces, edgeCases);
        return {
            designDoc,
            types,
            modules,
            interfaces,
            edgeCases,
            testPlan,
            interview: this.interview,
            unresolvedCount: this.getOpenQuestions().length,
        };
    }
    generateTestPlan(acceptanceCriteria, featureContent) {
        const featureName = this.interview?.featureName || 'unknown';
        const unitTests = [];
        const functionalTests = [];
        let id = 0;
        for (const ac of acceptanceCriteria) {
            id++;
            const test = this.createTestCaseFromAC(`TC-${String(id).padStart(3, '0')}`, ac);
            functionalTests.push(test);
        }
        const parsedKeywords = this.parseImplementationKeywords(featureContent);
        for (const kw of parsedKeywords) {
            id++;
            unitTests.push({
                id: `TC-${String(id).padStart(3, '0')}`,
                category: 'unit',
                description: `${kw.name} unit test`,
                given: `${kw.name} is initialized`,
                when: `${kw.method || 'the main method'} is called`,
                then: `returns expected result`,
                coverageTarget: `AC: ${acceptanceCriteria[0] || 'implementation'}`,
            });
        }
        const dependencies = this.extractDependencies(featureContent);
        const regressionTargets = new Set(dependencies);
        const resolved = this.getResolvedQuestions();
        const integrationMentions = resolved
            .filter(q => q.category === 'integration')
            .map(q => q.answer);
        for (const int of integrationMentions) {
            if (int.trim()) {
                regressionTargets.add(int.trim());
            }
        }
        return {
            featureName,
            unitTests,
            functionalTests,
            regressionTargets: [...regressionTargets],
        };
    }
    async askQuestion(questionId) {
        if (!this.interview)
            return '';
        const q = this.interview.questions.find((q) => q.id === questionId);
        return q ? q.question : '';
    }
    interviewSummary() {
        if (!this.interview)
            return 'No interview active.';
        const lines = [
            `## 设计访谈: ${this.interview.featureName}`,
            '',
            `- 总问题数: ${this.interview.questions.length}`,
            `- 已确认: ${this.getResolvedQuestions().length}`,
            `- 待确认: ${this.getOpenQuestions().length}`,
            `- 当前轮次: ${this.interview.currentRound}`,
            '',
            '### 按类别统计',
            '',
        ];
        for (const cat of CATEGORIES) {
            const total = this.interview.questions.filter((q) => q.category === cat.id).length;
            const resolved = this.interview.questions.filter((q) => q.category === cat.id && q.resolved).length;
            if (total > 0) {
                const bar = resolved === total ? '████████' : '▰▰▰▰' + '▱▱▱▱'.slice(0, 4);
                lines.push(`- ${cat.label}: ${resolved}/${total} ${bar} ${cat.critical ? '[关键]' : ''}`);
            }
        }
        const status = this.isReadyToFinalize();
        if (!status.ready) {
            lines.push('');
            lines.push('### 缺失关键类别: ' + status.missingCategories.join(', '));
        }
        else {
            lines.push('');
            lines.push('### 所有关键类别已覆盖，可以生成设计文档');
        }
        return lines.join('\n');
    }
    goToNextRound() {
        if (!this.interview)
            return [];
        this.interview.currentRound++;
        const remaining = this.getOpenQuestions();
        if (remaining.length === 0) {
            for (const cat of CATEGORIES) {
                if (!cat.critical)
                    continue;
                const unanswered = this.interview.questions.some((q) => q.category === cat.id && !q.resolved);
                const hasShortAnswers = this.interview.questions.some((q) => q.category === cat.id && q.resolved && q.answer.length < 20);
                if (unanswered || hasShortAnswers) {
                    const deepDive = this.generateDeepDiveQuestions(cat.id);
                    this.interview.questions.push(...deepDive);
                }
            }
        }
        return this.getOpenQuestions();
    }
    generateInitialQuestions(featureName, content, tasks) {
        const questions = [];
        const text = content + '\n' + tasks.map((t) => t.description).join('\n');
        const lower = text.toLowerCase();
        let id = 0;
        const coveredCategories = new Set();
        for (const cat of CATEGORIES) {
            for (const trigger of CATEGORY_TRIGGERS[cat.id]) {
                if (lower.includes(trigger)) {
                    coveredCategories.add(cat.id);
                    break;
                }
            }
        }
        for (const cat of CATEGORIES) {
            const hasInfo = coveredCategories.has(cat.id);
            const seedQuestions = this.getSeedQuestions(cat.id, featureName, content, hasInfo);
            for (const seed of seedQuestions) {
                id++;
                questions.push({
                    id: `Q-${String(id).padStart(3, '0')}`,
                    category: cat.id,
                    question: seed.question,
                    context: seed.context,
                    answer: '',
                    resolved: false,
                    round: 1,
                    followUpGenerated: false,
                });
            }
        }
        return questions;
    }
    getSeedQuestions(category, featureName, content, hasInfo) {
        const detailLevel = hasInfo ? 'deepen' : 'establish';
        switch (category) {
            case 'scope':
                return detailLevel === 'establish'
                    ? [
                        {
                            question: `"${featureName}" 的核心功能是什么？请用一句话描述。`,
                            context: '文档中功能边界不够清晰，需要确认核心价值。',
                        },
                        {
                            question: '哪些功能明确不在本期范围内？',
                            context: '明确排除项可以避免后续开发范围蔓延。',
                        },
                        {
                            question: '这个功能的直接用户是谁？他们当前怎么解决这个问题的？',
                            context: '理解用户画像和现状能帮助判断 MVP 的边界。',
                        },
                    ]
                    : [
                        {
                            question: `文档提到了一些功能，其中哪些是 MVP 必须的？哪些可以放二期？`,
                            context: '和任务列表交叉验证优先级。',
                        },
                        {
                            question: '有没有文档未提及但实际需要的功能？',
                            context: '防止需求遗漏。',
                        },
                    ];
            case 'data_model':
                return detailLevel === 'establish'
                    ? [
                        {
                            question: '系统需要处理哪些核心实体？它们的关系是什么？（一对一/一对多/多对多）',
                            context: '数据模型是设计的根基。',
                        },
                        {
                            question: '每个实体有哪些必须字段？哪些是唯一标识？',
                            context: '明确核心字段有助于类型定义。',
                        },
                        {
                            question: '数据需要持久化吗？用什么方式存储？',
                            context: '决定数据层的技术选型。',
                        },
                    ]
                    : [
                        {
                            question: `文档中提到的数据结构，字段的具体类型和约束是什么？（必填/可选/唯一/长度限制等）`,
                            context: '将模糊描述转为精确类型定义。',
                        },
                        {
                            question: '数据之间有没有需要保证一致性的场景？（如删除用户时关联数据的处理）',
                            context: '级联操作和事务边界。',
                        },
                    ];
            case 'interface':
                return [
                    {
                        question: `"${featureName}" 的对外接口是什么样的？输入什么，输出什么？`,
                        context: '定义 API 契约。',
                    },
                    {
                        question: '接口的错误处理策略是什么？不同错误场景返回什么？',
                        context: '错误码设计影响前端体验。',
                    },
                    {
                        question: '接口需要认证/鉴权吗？权限模型是什么样的？',
                        context: '安全层面的接口设计约束。',
                    },
                ];
            case 'user_flow':
                return [
                    {
                        question: '用户完成一次完整操作的步骤是什么？请从入口到出口描述。',
                        context: '端到端流程验证。',
                    },
                    {
                        question: '每个步骤中，用户可能在哪一步出错？出错后怎么恢复？',
                        context: '异常流程设计。',
                    },
                    {
                        question: '有没有多用户交互的场景？（如 A 操作影响 B 的界面）',
                        context: '协作场景和状态同步。',
                    },
                ];
            case 'edge_cases':
                return [
                    {
                        question: '极端情况下会发生什么？（数据为空、并发操作、网络断开、超大数据量）',
                        context: '边界和异常是 bug 的高发区。',
                    },
                    {
                        question: '有哪些隐含假设需要确认？（如"用户一定已登录"、"数据一定存在"）',
                        context: '显性化隐含假设。',
                    },
                    {
                        question: '如果外部依赖不可用，系统应该如何降级？',
                        context: '容错和降级策略。',
                    },
                ];
            case 'non_functional':
                return [
                    {
                        question: '对性能有什么要求？（响应时间、并发数、数据量级）',
                        context: '性能约束影响架构选型。',
                    },
                    {
                        question: '安全方面有什么特殊要求？（数据加密、防注入、审计日志）',
                        context: '安全需求影响实现细节。',
                    },
                    {
                        question: '需要在哪些环境运行？（浏览器版本、Node.js 版本、操作系统）',
                        context: '兼容性约束。',
                    },
                ];
            case 'constraints':
                return [
                    {
                        question: '有没有必须使用的技术栈或禁止使用的技术？',
                        context: '技术约束影响方案选择。',
                    },
                    {
                        question: '有没有时间节点或上线要求？',
                        context: '时间约束影响架构复杂度取舍。',
                    },
                    {
                        question: '团队成员的技术栈偏好是什么？',
                        context: '团队能力匹配。',
                    },
                ];
            case 'integration':
                return [
                    {
                        question: '需要对接哪些外部系统？接口文档有吗？',
                        context: '集成依赖影响整体架构。',
                    },
                    {
                        question: '外部系统的 SLA 是什么？不可用时怎么办？',
                        context: '容错和熔断设计。',
                    },
                    {
                        question: '数据格式需要转换吗？谁负责转换？',
                        context: '数据适配层设计。',
                    },
                ];
        }
    }
    generateFollowUpQuestions(answered, answer) {
        const followUps = [];
        const lower = answer.toLowerCase();
        let idSeed = Date.now();
        if (/并发|同时|多个.*同时|race/i.test(lower) && answered.category !== 'edge_cases') {
            followUps.push({
                id: `Q-F${++idSeed}`,
                category: 'edge_cases',
                question: `你提到了并发场景，具体是几个用户同时操作？冲突时以谁为准？`,
                context: `基于你对"${answered.question}"的回答中提到了并发，需要明确并发策略。`,
                answer: '',
                resolved: false,
                round: this.interview.currentRound + 1,
                followUpGenerated: false,
            });
        }
        if (/外部|第三方|调用|API|接口.*对接/i.test(lower) && answered.category !== 'integration') {
            followUps.push({
                id: `Q-F${++idSeed}`,
                category: 'integration',
                question: `你提到了外部依赖，具体是哪个系统？对接方式是什么？（HTTP/gRPC/消息队列）`,
                context: `基于你对"${answered.question}"的回答，需要明确集成细节。`,
                answer: '',
                resolved: false,
                round: this.interview.currentRound + 1,
                followUpGenerated: false,
            });
        }
        if (/安全|加密|权限|认证|token|密码/i.test(lower) && answered.category !== 'non_functional') {
            followUps.push({
                id: `Q-F${++idSeed}`,
                category: 'non_functional',
                question: `你提到了安全相关的内容，具体的认证机制是什么？敏感数据怎么存储？`,
                context: `基于你对"${answered.question}"的回答，需要明确安全策略。`,
                answer: '',
                resolved: false,
                round: this.interview.currentRound + 1,
                followUpGenerated: false,
            });
        }
        if (/数据|存储|数据库|字段|表/i.test(lower) && answered.category !== 'data_model') {
            followUps.push({
                id: `Q-F${++idSeed}`,
                category: 'data_model',
                question: `你提到了数据存储，具体的数据结构是什么样的？有哪些索引？`,
                context: `基于你对"${answered.question}"的回答，需要细化数据模型。`,
                answer: '',
                resolved: false,
                round: this.interview.currentRound + 1,
                followUpGenerated: false,
            });
        }
        return followUps;
    }
    generateDeepDiveQuestions(category) {
        const questions = [];
        let idSeed = Date.now() + 1000;
        const deepDiveSeeds = {
            scope: ['如果时间不够，最简化的版本长什么样？', '这个功能的成功标准是什么？上线后怎么衡量？'],
            data_model: ['数据的生命周期是什么？（创建→修改→删除→归档）', '有没有需要做软删除的数据？'],
            interface: ['接口的幂等性需要保证吗？', '接口返回值需要分页吗？分页参数怎么设计？'],
            user_flow: ['新用户和老用户的体验路径应该一样吗？', '有没有需要异步通知用户的场景？'],
            edge_cases: ['假设数据量增长 100 倍，现在的方案还成立吗？', '有没有跨国多时区的问题？'],
            non_functional: ['日志和监控怎么设计？关键指标是什么？', '灰度发布策略是什么？怎么回滚？'],
            constraints: ['有没有合规要求？（GDPR、等保等）', '代码需要支持国际化吗？'],
            integration: ['外部接口的调用频率有限制吗？需要做缓存吗？', '外部接口变更时怎么保证兼容？'],
        };
        const seeds = deepDiveSeeds[category] || [];
        for (const seed of seeds) {
            idSeed++;
            questions.push({
                id: `Q-D${idSeed}`,
                category,
                question: seed,
                context: `第 ${this.interview.currentRound + 1} 轮深入探讨 —— ${CATEGORIES.find((c) => c.id === category)?.label || category}。`,
                answer: '',
                resolved: false,
                round: this.interview.currentRound + 1,
                followUpGenerated: false,
            });
        }
        return questions;
    }
    generateTypesFromAnswers() {
        const resolved = this.getResolvedQuestions();
        const dataModelAnswers = resolved
            .filter((q) => q.category === 'data_model')
            .map((q) => q.answer)
            .join('\n');
        if (!dataModelAnswers.trim())
            return '// No type definitions generated — data model section not answered.';
        const lines = ['// Generated from design interview answers', ''];
        const entityMatches = dataModelAnswers.matchAll(/(?:实体|Entity|Model|模型|struct|对象)[：:]\s*(\w+)/gi);
        const entities = new Set();
        for (const m of entityMatches) {
            entities.add(m[1]);
        }
        const fieldGroups = dataModelAnswers.matchAll(/(\w+)\s*(?:需要|包含|有|包含以下)\s*(?:字段|属性|field|property)[：:]\s*([\s\S]*?)(?=\.|\n\n|$)/gi);
        const entityFields = new Map();
        for (const m of fieldGroups) {
            const fields = m[2]
                .split(/[,;，；]/)
                .map((f) => f.trim())
                .filter(Boolean);
            entityFields.set(m[1], fields);
        }
        for (const entity of entities) {
            const fields = entityFields.get(entity);
            if (fields && fields.length > 0) {
                lines.push(`export interface ${entity} {`);
                for (const field of fields) {
                    const type = this.inferFieldType(field, dataModelAnswers);
                    lines.push(`  ${this.camelCase(field)}: ${type}`);
                }
                lines.push('}');
                lines.push('');
            }
        }
        if (lines.length === 2) {
            return '// Type definitions could not be fully inferred. Review the data model answers for specific field lists.';
        }
        return lines.join('\n');
    }
    inferFieldType(field, context) {
        const lower = field.toLowerCase();
        if (/id$|编号|标识/.test(lower))
            return 'string';
        if (/时间|日期|created|updated|date|time|timestamp/.test(lower))
            return 'string';
        if (/金额|价格|price|amount|数量|count|num|年龄|age/.test(lower))
            return 'number';
        if (/是否|is_|has_|flag|enabled|disabled|状态|status/.test(lower))
            return 'boolean';
        if (/列表|数组|list|array|items|集合/.test(lower))
            return 'string[]';
        if (/对象|json|object|map|dict|config/.test(lower))
            return 'Record<string, unknown>';
        return 'string';
    }
    camelCase(str) {
        const cleaned = str.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
        if (/[\u4e00-\u9fa5]/.test(cleaned)) {
            return cleaned.toLowerCase().replace(/\s+/g, '_');
        }
        return cleaned
            .split(/[_-\s]+/)
            .map((w, i) => i === 0
            ? w.toLowerCase()
            : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join('');
    }
    extractModulesFromAnswers() {
        const resolved = this.getResolvedQuestions();
        const modules = [];
        const seen = new Set();
        for (const q of resolved) {
            const moduleMatches = q.answer.matchAll(/(?:模块|Module|Service|服务|Controller|Handler|Repository)[：:]\s*(\w+)/gi);
            for (const m of moduleMatches) {
                const name = m[1];
                if (!seen.has(name)) {
                    seen.add(name);
                    modules.push(`${name}: ${q.category}`);
                }
            }
        }
        if (modules.length === 0) {
            const featureName = this.interview?.featureName || 'feature';
            modules.push(`${featureName}: core module`);
        }
        return modules;
    }
    extractInterfacesFromAnswers() {
        const resolved = this.getResolvedQuestions();
        const interfaceAnswers = resolved
            .filter((q) => q.category === 'interface')
            .map((q) => q.answer)
            .join('\n');
        const contracts = [];
        const methodMatches = interfaceAnswers.matchAll(/(?:方法|method|API|接口)[：:]\s*(\w+)/gi);
        for (const m of methodMatches) {
            contracts.push(`\`${m[1]}\``);
        }
        const pathMatches = interfaceAnswers.matchAll(/\/[\w\-\/]+/g);
        for (const m of pathMatches) {
            contracts.push(`\`${m[0]}\``);
        }
        if (contracts.length === 0) {
            contracts.push('`(待从接口设计中确认)`');
        }
        return contracts;
    }
    collectEdgeCases() {
        const resolved = this.getResolvedQuestions();
        const edgeCaseAnswers = resolved
            .filter((q) => q.category === 'edge_cases')
            .map((q) => q.answer);
        const edgeCases = [];
        for (const answer of edgeCaseAnswers) {
            const lines = answer.split(/[。\n]/);
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && trimmed.length > 5) {
                    edgeCases.push(trimmed);
                }
            }
        }
        if (edgeCases.length === 0) {
            edgeCases.push('(边界情况未明确 — 建议重新审视 edge_cases 类别)');
        }
        return edgeCases;
    }
    buildDesignDoc(types, modules, interfaces, edgeCases) {
        const interview = this.interview;
        const resolved = this.getResolvedQuestions();
        const lines = [
            `# ${interview.featureName}`,
            '',
            '> 本文档由交互式设计访谈生成，所有设计决策均有 Q&A 追溯。',
            '',
            '---',
            '',
            '## 设计访谈摘要',
            '',
            `- 总问题: ${interview.questions.length} | 已回答: ${resolved.length}`,
            `- 访谈轮次: ${interview.currentRound}`,
            '',
            '### 访谈记录',
            '',
        ];
        for (const cat of CATEGORIES) {
            const catQuestions = interview.questions.filter((q) => q.category === cat.id && q.resolved);
            if (catQuestions.length === 0)
                continue;
            lines.push(`#### ${cat.label}`);
            lines.push('');
            for (const q of catQuestions) {
                lines.push(`> **Q:** ${q.question}`);
                lines.push(`> **A:** ${q.answer}`);
                lines.push('');
            }
        }
        lines.push('---', '', '## 数据模型', '', '```typescript', types, '```', '');
        lines.push('## 模块划分', '');
        if (modules.length === 0) {
            lines.push('*暂无明确模块划分。*');
        }
        else {
            for (const m of modules) {
                const [name, ...rest] = m.split(': ');
                lines.push(`- **${name}** — ${rest.join(': ')}`);
            }
        }
        lines.push('');
        lines.push('## 接口契约', '');
        if (interfaces.length === 0) {
            lines.push('*接口契约待确认。*');
        }
        else {
            for (const i of interfaces) {
                lines.push(`- ${i}`);
            }
        }
        lines.push('');
        lines.push('## 边界情况', '');
        for (const e of edgeCases) {
            lines.push(`- ${e}`);
        }
        lines.push('');
        lines.push('## 任务列表', '');
        lines.push('| ID | 描述 | 优先级 | 预估大小 |');
        lines.push('|---|---|---|---|');
        for (const t of interview.tasks) {
            lines.push(`| ${t.id} | ${t.description} | ${t.priority} | ${t.size} |`);
        }
        lines.push('');
        return lines.join('\n');
    }
    createTestCaseFromAC(id, ac) {
        const lower = ac.toLowerCase();
        let given = 'system is in initial state';
        let when = 'the feature is used';
        let then = ac;
        const whenMatch = ac.match(/(?:当|when|用户|点击|输入|调用|请求|操作)(.+?)(?:时|后|，|。|$)/);
        if (whenMatch) {
            when = `user ${whenMatch[0].trim()}`;
        }
        const resultMatch = ac.match(/(?:则|then|应该|返回|得到|显示)(.+)/);
        if (resultMatch) {
            then = resultMatch[1].trim();
        }
        if (/登录|login|auth/i.test(lower)) {
            given = 'user is on login page';
            if (!when.includes('登录') && !when.includes('login')) {
                when = 'user submits credentials';
            }
        }
        if (/错误|error|fail|失败/i.test(lower)) {
            given = 'invalid input is provided';
        }
        if (/空|empty|无数据|no data/i.test(lower)) {
            given = 'no data exists';
        }
        if (/并发|concurrent|同时/i.test(lower)) {
            given = 'multiple users perform action simultaneously';
        }
        return {
            id,
            category: 'functional',
            description: `Acceptance test: ${ac.slice(0, 80)}`,
            given,
            when,
            then,
            coverageTarget: ac,
        };
    }
    parseImplementationKeywords(content) {
        const keywords = [];
        const serviceMatches = [...content.matchAll(/(\w+Service)\b/g)];
        const repoMatches = [...content.matchAll(/(\w+Repository)\b/g)];
        const handlerMatches = [...content.matchAll(/(\w+Handler)\b/g)];
        const controllerMatches = [...content.matchAll(/(\w+Controller)\b/g)];
        const managerMatches = [...content.matchAll(/(\w+Manager)\b/g)];
        for (const m of [...serviceMatches, ...repoMatches, ...handlerMatches, ...controllerMatches, ...managerMatches]) {
            keywords.push({ name: m[1] });
        }
        return keywords;
    }
    extractDependencies(content) {
        const deps = new Set();
        const depMatches = content.matchAll(/depends_on:\s*\[([^\]]*)\]/g);
        for (const m of depMatches) {
            for (const dep of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
                deps.add(dep);
            }
        }
        return [...deps];
    }
    parseAcceptanceCriteria(content) {
        const sectionMatch = content.match(/##\s*验收标准\s*\n([\s\S]*?)(?=\n##|$)/);
        if (!sectionMatch)
            return [];
        const lines = sectionMatch[1].split('\n');
        const criteria = [];
        for (const line of lines) {
            const trimmed = line.trim();
            const listMatch = trimmed.match(/^[-*]\s*\[([ x])\]\s*(.+)/);
            if (listMatch) {
                criteria.push(listMatch[2].trim());
            }
            else {
                const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
                if (bulletMatch) {
                    criteria.push(bulletMatch[1].trim());
                }
            }
        }
        return criteria;
    }
    async design(featurePath, tasks) {
        await this.startInterview(featurePath, tasks);
        const result = await this.finalize();
        return {
            designDoc: result.designDoc,
            types: result.types,
            modules: result.modules,
            interfaces: result.interfaces,
            edgeCases: result.edgeCases,
            testPlan: result.testPlan,
        };
    }
}
exports.Designer = Designer;
//# sourceMappingURL=index.js.map