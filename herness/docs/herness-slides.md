---
marp: true
theme: uncover
class: invert
size: 16:9
paginate: true
_paginate: false
style: |
  :root {
    --bg: #0f0f1a;
    --card: #1a1a2e;
    --accent: #e94560;
    --accent2: #0f3460;
    --green: #00d2a0;
    --yellow: #ffc107;
    --text: #e0e0e0;
    --muted: #8888aa;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }
  section {
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
    color: var(--text);
    padding: 40px 60px;
  }
  section.lead {
    background: linear-gradient(135deg, #0f0f1a 0%, #e94560 100%);
    text-align: center;
  }
  section.lead h1 {
    font-size: 3em;
    color: white;
    border: none;
    text-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }
  section.lead p { color: rgba(255,255,255,0.85); font-size: 1.3em; }
  h1 {
    font-size: 2em;
    border-bottom: 3px solid var(--accent);
    padding-bottom: 12px;
    margin-bottom: 24px;
  }
  h2 { color: var(--accent); font-size: 1.5em; margin-bottom: 16px; }
  h3 { font-size: 1.2em; color: var(--green); }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    font-size: 0.75em;
  }
  thead th {
    background: var(--accent);
    color: white;
    padding: 14px 16px;
    text-align: left;
    font-weight: 600;
  }
  tbody td {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: var(--card);
  }
  tbody tr:last-child td { border-bottom: none; }
  .card {
    background: var(--card);
    border-radius: 12px;
    padding: 24px;
    margin: 12px 0;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    border-left: 4px solid var(--accent);
  }
  .card.green { border-left-color: var(--green); }
  .card.yellow { border-left-color: var(--yellow); }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
  }
  .grid-4 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 12px;
    font-size: 0.72em;
  }
  .tag {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.7em;
    font-weight: 600;
    margin-right: 8px;
  }
  .tag.red { background: var(--accent); color: white; }
  .tag.green { background: var(--green); color: #0f0f1a; }
  .tag.blue { background: var(--accent2); color: white; }
  .flow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.8em;
    flex-wrap: wrap;
  }
  .flow-box {
    background: var(--card);
    border: 2px solid var(--accent);
    border-radius: 10px;
    padding: 16px 20px;
    text-align: center;
  }
  .flow-arrow { color: var(--accent); font-size: 1.5em; }
  .big-number {
    font-size: 3em;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .stat-label { color: var(--muted); font-size: 0.8em; }
  .layer {
    border-radius: 12px;
    padding: 20px;
    margin: 8px 0;
  }
  .layer.top { background: linear-gradient(135deg, #e9456033, #e9456011); border: 1px solid #e9456044; }
  .layer.mid { background: linear-gradient(135deg, #0f346033, #0f346011); border: 1px solid #0f346044; }
  .layer.bottom { background: linear-gradient(135deg, #00d2a033, #00d2a011); border: 1px solid #00d2a044; }
  .check { color: var(--green); }
  .cross { color: var(--accent); }
  .warn { color: var(--yellow); }
  code { background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 6px; font-size: 0.85em; }
  pre { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; font-size: 0.65em; }
  .cols { display: flex; gap: 24px; }
  .col { flex: 1; }
  .icon { font-size: 2em; margin-bottom: 8px; display: block; }
---

<!-- _class: lead -->
# ⚡ Herness

### 文档驱动的多 Agent 开发框架

Feature 定义需求 → Agent 协同 → 全链验证 → 回溯可查

---

# 🎯 AI 辅助开发的四大痛点

<div class="grid-2">
<div class="card">

🔀 **上下文爆炸**
一次性塞入所有需求，Agent 抓不住重点，关键细节遗漏

</div>
<div class="card">

🏁 **过早宣布胜利**
测试跑通就说完成，边界情况、回归影响、隐含假设全忽略

</div>
<div class="card">

🔄 **冷启动循环**
每次新会话从零开始，上次踩过的坑重新踩，不会积累经验

</div>
<div class="card">

❓ **不可追溯**
"谁改了什么？为什么改？什么时候改的？"——一团迷雾

</div>
</div>

---

# 🏗️ 架构全景

<div class="layer top">
<strong>🎭 编排层</strong> — Orchestrator：调度 Agent、状态管理、崩溃恢复、Guard 分发、进度报告
</div>

<div class="layer mid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px;">
<div><strong>📋 Planner</strong><br/><small>需求拆解<br/>依赖图+优先级</small></div>
<div><strong>💬 Designer</strong><br/><small>交互访谈<br/>8类别×N轮</small></div>
<div><strong>🔨 Developer</strong><br/><small>代码+测试<br/>安全路径校验</small></div>
<div><strong>🔍 Validator</strong><br/><small>三Agent并行<br/>功能/规范/安全</small></div>
<div><strong>🛡️ VictoryGate</strong><br/><small>5层审查<br/>防过早宣布</small></div>
<div><strong>🧠 Reflector</strong><br/><small>错误诊断<br/>修复建议</small></div>
</div>

<div class="layer bottom" style="margin-top:8px;">
<strong>📦 存储 + 安全层</strong> — Handoff / Context / Trace / Checkpoint / TrashBin / Memory / Guard
</div>

---

# ⚙️ 7 步完整流程

<div style="display:flex;flex-direction:column;gap:8px;font-size:0.75em;">

<div style="display:flex;align-items:center;gap:12px;">
<div class="flow-box" style="flex:1;">📝 <strong>写 Feature 文档</strong><br/><small>features/user-auth.feature.md</small></div>
<span class="flow-arrow">→</span>
<div class="flow-box" style="flex:1;">📋 <strong>Planner 拆解</strong><br/><small>依赖图 + 优先级 + 估时</small></div>
<span class="flow-arrow">→</span>
<div class="flow-box" style="flex:1;">💬 <strong>Designer 访谈</strong><br/><small>24题 → N轮追问 → TestPlan</small></div>
</div>

<div style="display:flex;align-items:center;gap:12px;">
<div class="flow-box" style="flex:1;">🎨 <strong>PlantUML 图表</strong><br/><small>类图/时序图/组件图/用例图</small></div>
<span class="flow-arrow">→</span>
<div class="flow-box" style="flex:1;">🔨 <strong>Developer</strong><br/><small>src/*.ts + __tests__/</small></div>
<span class="flow-arrow">→</span>
<div class="flow-box" style="flex:1;">🔍 <strong>Validator</strong><br/><small>三Agent并行 + 回归</small></div>
</div>

<div style="display:flex;align-items:center;gap:12px;">
<div class="flow-box" style="flex:1;">🛡️ <strong>VictoryGate</strong><br/><small>AC逐条 + Critic + 硬门槛</small></div>
<span class="flow-arrow">→</span>
<div class="flow-box" style="flex:1;">🧠 <strong>Reflector</strong><br/><small>诊断 → 修复 → retry</small></div>
<span class="flow-arrow" style="font-size:2em;">→</span>
<div class="flow-box" style="flex:1;background:var(--green);color:#0f0f1a;">✅ <strong>完成</strong><br/><small>经验归档 + 记忆更新</small></div>
</div>

</div>

---

# 🎭 7 种 Agent

<table>
<thead>
<tr><th>Agent</th><th>职责</th><th>约束</th></tr>
</thead>
<tbody>
<tr><td>📋 <strong>Planner</strong></td><td>需求分析、任务拆解、依赖图、优先级排序、EMA权重进化</td><td>不写代码</td></tr>
<tr><td>💬 <strong>Designer</strong></td><td>交互式访谈、8类别种子问题、跨类别追问、TestPlan生成</td><td>不写代码</td></tr>
<tr><td>🔨 <strong>Developer</strong></td><td>TypeScript代码生成、GIVEN-WHEN-THEN测试文件生成</td><td>只写 features/&lt;name&gt;/</td></tr>
<tr><td>🔍 <strong>Validator</strong></td><td>三Agent并行验证（功能+规范+安全）+ 断路器 + 分层</td><td>不修改代码</td></tr>
<tr><td>🧠 <strong>Reflector</strong></td><td>6种错误分类、历史trace学习、修复建议+retry判定</td><td>只读不写</td></tr>
<tr><td>🎨 <strong>PlantUML</strong></td><td>5种图自动生成（类图/时序图/组件图/用例图/活动图）</td><td>只写 diagrams/</td></tr>
<tr><td>🛡️ <strong>VictoryGate</strong></td><td>AC逐条、设计覆盖、Critic20题、硬性门槛、改善检测</td><td>maxRetries后停止</td></tr>
</tbody>
</table>

---

# 💬 交互式设计访谈

<div style="display:flex;gap:20px;font-size:0.7em;">
<div style="flex:1;">

**不是自动生成，是逐条确认！**

<div class="card">
🔍 <strong>第1轮</strong> — 24个种子问题

| 类别 | 典型问题 |
|------|---------|
| scope | 核心功能？排除项？用户是谁？ |
| data_model | 实体？字段？1:1/1:N/N:M？ |
| interface | 输入输出？错误码？幂等？ |
| user_flow | 端到端步骤？异常路径？ |
| edge_cases | 空数据？并发？降级？ |
| integration | 外部系统？SLA？格式？ |

</div>
</div>
<div style="flex:1;">

<div style="margin-top:32px;"></div>

<div class="card green">
📝 用户回答后 —— 自动追问

"用户邮箱密码登录，返回JWT token"

→ <span class="tag red">追问</span> 

"你提到了 token —— **token过期怎么刷新？并发登录怎么处理？**"

</div>

<div class="card yellow">
🔄 <strong>第2轮</strong> — 深入追问

`goToNextRound()` → 每个关键类别追加2道深度问题

<i>5个关键类别全绿 → 才能 finalize！</i>

</div>

</div>
</div>

---

# 🎨 PlantUML 5 种图

<div class="grid-3">

<div class="card">
<span class="icon">📊</span>
<strong>类 图</strong>
<small style="display:block;color:var(--muted)">TS接口 → 类+关系<br/>1:1 / 1:N / N:M 推断</small>
</div>

<div class="card">
<span class="icon">⏱️</span>
<strong>时序图</strong>
<small style="display:block;color:var(--muted)">用户流程 → 交互序列<br/>参与者自动发现</small>
</div>

<div class="card">
<span class="icon">🧩</span>
<strong>组件图</strong>
<small style="display:block;color:var(--muted)">模块+外部系统<br/>依赖关系+Contract</small>
</div>

<div class="card">
<span class="icon">👤</span>
<strong>用例图</strong>
<small style="display:block;color:var(--muted)">验收标准 → 用例<br/>Actor→UseCase</small>
</div>

<div class="card">
<span class="icon">🔀</span>
<strong>活动图</strong>
<small style="display:block;color:var(--muted)">流程+边界情况<br/>if/else 分支逻辑</small>
</div>

</div>

<div style="text-align:center;margin-top:20px;font-size:0.7em;color:var(--muted);">
<span class="tag blue">独立Agent</span>  <span class="tag blue">从设计产物自动生成</span>  <span class="tag blue">输出.puml直渲染</span>
</div>

---

# 🔍 三 Agent 并行验证

<div style="font-size:0.75em;">

```
validator.validate('user-auth', plan, artifacts, 'deep')

        ┌──────────────────────────────────┐
        │      Promise.all() 并行执行       │
        ├──────────────┬───────────────────┤
        ▼              ▼                   ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🧪 功能验证  │ │ 📏 规范审查  │ │ 🔐 安全排查  │
│              │ │              │ │              │
│ unit_test    │ │ compile      │ │ secret_scan  │
│ func_test    │ │ typecheck    │ │ dep_audit    │
│ regression   │ │ lint         │ │ injection    │
│ ac_coverage  │ │ design_cov   │ │ permission   │
│              │ │ code_style   │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
        │              │                   │
        └──────────────┼───────────────────┘
                       ▼
          任一个 critical → AbortController.abort()
                其他Agent 标记 aborted:true
                3次连续 → 断路器熔断5分钟
```

</div>

<div class="grid-3" style="margin-top:8px;">
<div><span class="tag green">light</span> CI快速 (5s)</div>
<div><span class="tag blue">standard</span> 日常 (20s)</div>
<div><span class="tag red">deep</span> 发布前 (30s)</div>
</div>

---

# 🛡️ 安全体系

<div class="grid-2">
<div>

### 📸 操作前
<div class="card green">
<strong>Checkpoint 快照</strong><br/>
复制原始文件 → .devkit/checkpoints/<br/>
SHA-256 完整性校验<br/>
记录 agentId + timestamp
</div>

</div>
<div>

### 🔄 操作后
<div class="card">
<strong>成功</strong> → checkpoint.commit()<br/>
<strong>失败</strong> → checkpoint.rollback()<br/>
<span style="color:var(--accent)">自动恢复操作前的文件内容</span>
</div>

<div class="card yellow" style="margin-top:8px;">
<strong>🗑️ 软删除</strong><br/>
删除 = 移到 .devkit/trash/<br/>
随时 restore() 恢复<br/>
24h后 purge() 自动清理
</div>

</div>
</div>

<div style="text-align:center;margin-top:16px;" class="card" >
⚡ <strong>Validator 检测到 critical → 自动 rollback 该 feature 的最新 checkpoint</strong>
</div>

---

# 🛡️ Guard 权限矩阵

<div style="font-size:0.7em;">

```
运行时强制：每次 fs.writeFileSync / readFileSync / execSync 前断言权限
越权操作 → Violation 累积 → guard-report.md
```

</div>

| Agent | 读 | 写 | exec | 操作上限 |
|-------|----|----|------|---------|
| **orchestrator** | 项目根 | `.devkit/` | — | 500 |
| **planner** | features/ , context/ | context/planner/ | — | 100 |
| **designer** | features/ | — | — | 200 |
| **developer** | features/ | **features/** | — | 200 |
| **validator** | features/ , .devkit/ | — | **✅** | 300 |
| **reflector** | features/ , traces/ | — | — | 200 |

<div style="font-size:0.65em;color:var(--accent);margin-top:8px;text-align:center;">
⛔ 黑名单：developer 禁写 docs/ lib/ shared/ .devkit/
</div>

---

# 🏆 胜利门禁

<div style="font-size:0.7em;">

```
Validator 全部通过 ≠ 真正完成

VictoryGate.evaluate() ─── 5层审查 ───┐
                                       │
  ┌────────────────────────────────────┘
  │
  ├─ ❶ AC逐条验证 ──→ verified / disputed / unverified ──→ unverified=blocking
  │
  ├─ ❷ 设计覆盖度 ──→ 设计每章→代码文件？ ──→ missing=blocking
  │
  ├─ ❸ Critic 20题 ──→ 5个类别深度审查 ──→ failed=blocking
  │     completeness | correctness | edge_case | spec_gap | assumption
  │
  ├─ ❹ 边界探针 ────→ 按feature类型定向 ──→ 信息收集
  │
  └─ ❺ 硬性门槛 ────→ no_todo | no_any | tests_exist | imports_ok ──→ 不可绕过

未通过 → retryHints → 修复 → 3次后仍失败 → 人工介入
confidence 不升反降 → "无改善"标记
```

</div>

---

# 🧠 自主学习体系

<div class="grid-2">

<div class="card green">
<span class="icon">📚</span>
<strong>经验回放</strong><br/>
<small>TraceStore: Jaccard 相似度检索<br/>新任务查历史 → 复用已知fix</small>
</div>

<div class="card">
<span class="icon">🔄</span>
<strong>反思循环</strong><br/>
<small>Validator失败 → Reflector诊断<br/>6种错误分类 → 建议 → retry</small>
</div>

<div class="card">
<span class="icon">📈</span>
<strong>策略进化</strong><br/>
<small>EMA权重修正 (alpha=0.3)<br/>≥10样本 → 拆解越来越准</small>
</div>

<div class="card yellow">
<span class="icon">💾</span>
<strong>跨会话记忆</strong><br/>
<small>每Agent: .devkit/memory/&lt;agent&gt;.md<br/>decision | convention | fix</small>
</div>

</div>

---

# 💻 CLI 一行命令

<pre style="font-size:0.68em;">
# 全局安装（一次）
git clone &lt;repo&gt; && cd herness
npm install && npm run build && npm link

# 任意项目使用
<span style="color:var(--green);">$</span> herness init                       <span style="color:var(--muted);"># 初始化项目结构</span>
<span style="color:var(--green);">$</span> herness new user-auth               <span style="color:var(--muted);"># 创建Feature文档</span>
<span style="color:var(--green);">$</span> herness plan user-auth              <span style="color:var(--muted);"># 任务拆解+依赖图</span>
<span style="color:var(--green);">$</span> herness verify user-auth --tier deep <span style="color:var(--muted);"># 三Agent并行验证</span>
<span style="color:var(--green);">$</span> herness diagram user-auth            <span style="color:var(--muted);"># 生成PlantUML 5种图</span>
<span style="color:var(--green);">$</span> herness worktree create user-auth    <span style="color:var(--muted);"># Git Worktree隔离</span>
<span style="color:var(--green);">$</span> herness status --watch              <span style="color:var(--muted);"># 实时Agent进度监控</span>
</pre>

---

# 🧩 SDK 一行导入

<pre style="font-size:0.62em;">
<span style="color:var(--accent);">import</span> {
  Planner, Designer, Developer, Validator,
  Pipeline, Guard, VictoryGate,
  CheckpointManager, TrashBin, AgentMemory
} <span style="color:var(--accent);">from</span> <span style="color:var(--green);">'herness'</span>

<span style="color:var(--muted);">// 一键编排全流程</span>
<span style="color:var(--accent);">const</span> p = <span style="color:var(--accent);">new</span> Pipeline(<span style="color:var(--green);">'/project'</span>)
<span style="color:var(--accent);">const</span> { tasks } = <span style="color:var(--accent);">await</span> p.plan(<span style="color:var(--green);">'user-auth'</span>)
<span style="color:var(--accent);">const</span> report  = <span style="color:var(--accent);">await</span> p.verify(<span style="color:var(--green);">'user-auth'</span>, artifacts, plan, <span style="color:var(--green);">'deep'</span>)

<span style="color:var(--muted);">// 防护注入</span>
<span style="color:var(--accent);">const</span> guard = p.getGuard()
<span style="color:var(--accent);">const</span> dev = <span style="color:var(--accent);">new</span> Developer(<span style="color:var(--green);">'features'</span>, guard)

<span style="color:var(--muted);">// 安全保护</span>
<span style="color:var(--accent);">const</span> cpm = <span style="color:var(--accent);">new</span> CheckpointManager(<span style="color:var(--green);">'.devkit'</span>)
<span style="color:var(--accent);">const</span> mem = <span style="color:var(--accent);">new</span> AgentMemory(<span style="color:var(--green);">'.devkit'</span>)
<span style="color:var(--accent);">await</span> mem.rememberFix(<span style="color:var(--green);">'developer'</span>, <span style="color:var(--green);">'使用bcrypt加密, salt=10'</span>)
</pre>

---

# 🌐 跨仓库完全隔离

<div style="text-align:center;margin:32px 0;">

```
        ~/node_modules/herness
        (全局安装一次，工具本体)
              │
     ┌────────┴────────┐
     ▼                 ▼
┌─────────┐      ┌─────────┐
│ 项目 A  │      │ 项目 B  │
│         │      │         │
│features/│      │features/│
│.devkit/ │      │.devkit/ │
│herness  │      │herness  │
│.json    │      │.json    │
│         │      │         │
│ 完全隔离 │      │ 完全隔离 │
└─────────┘      └─────────┘
```

</div>

<div style="text-align:center;color:var(--muted);font-size:0.7em;">
process.cwd() + detectRoot() → 自动定位项目根 → 状态全落当前项目
</div>

---

# 📊 一图全流程

<div style="font-size:0.62em;line-height:1.6;">

```
                   ┌─────────────────────────┐
                   │  📝 Feature 文档         │
                   │  + 验收标准 + 优先级      │
                   └────────────┬────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
        📋 Planner         💬 Designer        🎨 PlantUML
        任务拆解           交互访谈×N轮        5种图生成
        依赖图             TestPlan          .puml输出
              │                 │
              ▼                 ▼
        ┌─────────────────────────────┐
        │      🔨 Developer + Guard    │
        │   src/*.ts + __tests/*.test  │
        │   Checkpoint 快照备份        │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │     🔍 Validator (并行)      │
        │  🧪功能 ║ 📏规范 ║ 🔐安全   │
        │  任一个 critical → 熔断      │
        └──────┬──────────┬───────────┘
               │          │
          ✅ 通过     ❌ 失败 → 🧠 Reflector → retry
               │                        │
               ▼                    3次后停
        🛡️ VictoryGate
        5层审查 → 放行              人工介入
               │
               ▼
        ✅ 完成 → 📚 TraceStore + 💾 Memory
```

</div>

---

# 📦 17 个 Feature 全览

<div class="grid-4">

<div class="card">
<span class="tag green">F-001</span>
<strong>store-layer</strong>
<small>Handoff/Context/Archive/Trace</small>
</div>

<div class="card">
<span class="tag green">F-002</span>
<strong>orchestrator</strong>
<small>调度+恢复+Guard分发</small>
</div>

<div class="card">
<span class="tag blue">F-003</span>
<strong>planner-agent</strong>
<small>拆解+依赖图+进化</small>
</div>

<div class="card">
<span class="tag blue">F-004</span>
<strong>designer-agent</strong>
<small>访谈+TestPlan</small>
</div>

<div class="card">
<span class="tag blue">F-005</span>
<strong>developer-agent</strong>
<small>代码+测试生成</small>
</div>

<div class="card">
<span class="tag blue">F-006</span>
<strong>validator-agent</strong>
<small>三Agent并行+熔断</small>
</div>

<div class="card">
<span class="tag yellow">F-007</span>
<strong>trace</strong>
<small>执行轨迹+相似度</small>
</div>

<div class="card">
<span class="tag yellow">F-008</span>
<strong>reflector</strong>
<small>错误诊断+fix建议</small>
</div>

<div class="card">
<span class="tag yellow">F-009</span>
<strong>planner-evolve</strong>
<small>EMA权重修正</small>
</div>

<div class="card">
<span class="tag red">F-010</span>
<strong>victory-gate</strong>
<small>5层门禁审查</small>
</div>

<div class="card">
<span class="tag red">F-011</span>
<strong>safety-layer</strong>
<small>快照+回滚+软删除</small>
</div>

<div class="card">
<span class="tag green">F-012</span>
<strong>agent-sdk</strong>
<small>统一API+Pipeline</small>
</div>

<div class="card">
<span class="tag green">F-013</span>
<strong>lifecycle-hooks</strong>
<small>PreToolUse等扩展点</small>
</div>

<div class="card">
<span class="tag green">F-014</span>
<strong>session-monitor</strong>
<small>进度表+watch</small>
</div>

<div class="card">
<span class="tag green">F-015</span>
<strong>persistent-memory</strong>
<small>跨会话记忆</small>
</div>

<div class="card">
<span class="tag green">F-016</span>
<strong>worktree-isolation</strong>
<small>Git Worktree隔离</small>
</div>

<div class="card">
<span class="tag green">F-017</span>
<strong>plantuml-agent</strong>
<small>5种图自动生成</small>
</div>

</div>

---

<!-- _class: lead -->

# 🚀 开始使用

<pre style="background:transparent;font-size:1.2em;text-align:center;">
git clone &lt;repo&gt; && cd herness
npm install && npm run build && npm link

cd /your/project
herness init
herness new my-feature
herness verify my-feature --tier deep
</pre>

<div style="text-align:center;margin-top:40px;color:var(--muted);">

**每个Feature有文档 · 每个设计可追溯 · 每个变更可回滚 · 每次验证有熔断**

</div>
