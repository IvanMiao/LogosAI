# LogosAI Roadmap

- 状态：Active，唯一有效的实施顺序
- 更新日期：2026-08-09
- 当前阶段：`Discover 0`、`Delivery 1` 与已交付的 Cloud Foundation
- 当前事实与架构：[PROJECT.md](PROJECT.md)

## 文档规则

旧路线图把正确的工程风险组织成大型串行 P0，并在没有用户证据时提前决定了用户、Reader 形态、storage 和 agent infrastructure。本路线图改为产品发现与工程交付双轨，并用 evidence gate 控制扩张。

后续工作遵守四条规则：

1. 区分 `Fact`、`Hypothesis` 和 `Decision`，不把产品假设写成事实。
2. 产品发现和工程交付并行，不等待基础设施完成后才接触用户。
3. 工程使用可独立验证的纵切，不按 anchor、storage、skill 等技术层横向建设平台。
4. 当前 gate 未通过时，不启动下一阶段。

状态词：`Now` 可以主动推进；`Next` 等待已写明的启动条件；`Later` 等待 evidence gate；`Deferred` 当前没有实施授权。

## 产品命题与证据

LogosAI 探索的是 source-grounded AI reading assistance。候选核心任务是：

> 不离开当前文本理解一个困难片段，然后继续阅读；需要时，保存可重新找到的解释或个人笔记。

### 已确认事实

| ID | Fact | 影响 |
| --- | --- | --- |
| F1 | Workspace Alpha 已支持 import、Reader、selection toolbar、note、AI artifact 和本地恢复。 | 已有可做用户测试的原型，不再重建 workspace shell。 |
| F2 | Selection 只把 selected text 交给 anchor core，再匹配首个 normalized quote。 | 重复文本可能绑定错误位置。 |
| F3 | Explain、Translate、Vocab 共用 `detect → correct → interpret` workflow。 | 三个名称尚未代表经过验证的独立语义。 |
| F4 | Anchor skill 默认把全文传入后端。 | 成本、延迟、隐私和最小上下文都没有基线。 |
| F5 | Workspace 已支持多个 reading sessions，并能恢复各自 anchors 与 artifacts。 | 可以开始观察 session 重开和跨设备使用，但尚无 repeat-use 证据。 |
| F6 | 自动测试覆盖主要 contract；eval 命令只校验 dataset 结构。 | 尚无真实模型质量证据。 |
| F7 | 仓库没有访谈、留存、行为分析或可用性测试结果。 | 用户、入口和产品形态仍是假设。 |
| F8 | Better Auth + D1 已建立账号、per-user settings 和 durable reading sessions；email/password 可用，Google/GitHub 等待 OAuth credentials。 | Cloud capability 是明确产品决策，不代表 Gate 2 的用户需求已被验证。 |

### 2026-08-09 产品方向决策

产品负责人明确要求 Cloudflare user data、email/Google/GitHub login、per-user API key 与多 reading-session 管理。该明确授权覆盖了旧 roadmap 对 cloud auth 的 deferred 限制，因此交付了一个保持现有 Reader 与 FastAPI 的独立纵切；架构依据见 [ADR 0001](adr/0001-cloud-auth-and-reading-sessions.md)。Discover 结论仍未被替代，不能把实现本身当作用户价值证据。

### 待验证假设

| ID | Hypothesis | 最小验证 |
| --- | --- | --- |
| H1 | 非母语困难长文读者是最强首发用户。 | 观察 5-8 名候选用户的真实阅读过程，获得至少 3 个独立 pain evidence。 |
| H2 | 用户愿意把真实文本带入 LogosAI。 | 用参与者自己的文档测试 import、BYOK 和开始阅读的流失点。 |
| H3 | Source-linked Explain 能解决高频阅读阻力。 | 交付可靠 Explain 后观察用户是否恢复阅读。 |
| H4 | 保存 artifact/note 和重开文档会带来重复使用。 | 运行 1-2 周、5-10 人的 diary beta。 |
| H5 | 主动 PreRead 比按需帮助创造更多价值。 | 先做 concierge prototype，不建设 agent infrastructure。 |
| H6 | Gemini BYOK 对目标用户可接受。 | 记录 key 获取、理解、放弃和安全顾虑。 |
| H7 | Close Read 比普通聊天或翻译更有差异化。 | 对比 Explain、Close Read 和参与者现有工具。 |

## 用户旅程与测量

待验证的最小旅程：

```text
带入真实文本并完成 BYOK
  → 开始阅读
  → 遇到理解阻力
  → 选择 passage 并获得帮助
  → 判断回答是否可信、有用
  → 继续阅读
  → 可选：保存并在之后返回
```

候选 north-star outcome 是 `resolved reading friction`：用户获得 source-grounded help 后能够继续阅读。它是测量框架，不是已经验证的业务指标。

需要建立的基线：import/BYOK 完成率、time to first useful artifact、helpful/inaccurate/insufficient-context 反馈、source passage 可定位率、action 后继续阅读、第二篇文档/第二次 session、anchor/stream/storage failure、first-token/total latency 和每次 action 成本。

Telemetry 必须经过用户同意，默认不上传完整原文、完整 prompt、API key 或私人 note。

## Now：并行双轨

### Discover 0：Problem Discovery

目标：确认谁在什么场景中遇到最频繁、最昂贵的阅读阻力。

任务：

- 招募 5-8 名候选用户，覆盖进阶语言学习、非母语论文和高频困难长文等场景。
- 参与者携带最近真实阅读过的文本；观察现有 workflow，不只询问功能偏好。
- 记录 source type、文本长度、设备、语言组合、频率、替代工具和切换成本。
- 单独测试 paste/file import 与 Gemini BYOK。
- 为 H1、H2、H3、H6、H7 同时收集支持和反对证据。

退出条件：能具体描述首发用户、阅读场景、发生频率和替代方案，并判断内置 Reader、text import 与 BYOK 是否适合作为首发入口。若 H1 不成立，先调整用户和场景。

### Delivery 1：Exact Selection To Note

目标：先证明 source link 可靠，不依赖模型质量。

范围：

- 从 DOM `Range` 得到真实 document position，不再通过 selected text 查找首个匹配。
- Alpha 可以先限制单段 selection；数据形状保留未来跨段 range。
- Anchor 保存 exact quote、position 和少量前后文，检测 missing 或 ambiguous。
- Anchored note 在 selection 清除和 refresh 后仍回到正确 passage。
- 显式测试重复 quote、Unicode、空 selection 和无法恢复。

非目标：多文档 library、document revision platform、IndexedDB migration、同时改写所有 AI skill。

验收：

- 选择第二个相同句子时不会绑定到第一个。
- Note reload 后仍指向原 passage。
- 无法唯一解析时显示失效状态，不静默猜测。
- Frontend lint、test、build 通过。

## Next

### Discover 1：Core Workflow Test

启动条件：Delivery 1 可用于测试。

用 5-8 名参与者及其真实文本测试 `import → read → select → help → resume`。记录任务完成率、time on task、错误、协助点和 critical issue severity；至少覆盖 missing key、低质量回答或中断 stream 中的一种失败；比较 Explain、Close Read 与现有工具。

输出：core journey usability report、action 价值排序、Reader/companion 形态证据，以及 Delivery 2 的 prompt、context 和 UX 要求。

### Delivery 2：Reliable Explain Vertical Slice

启动条件：Discover 0 确认用户与场景，Delivery 1 建立可靠 source link。

目标：让一个 Explain action 在语义、transport、provenance 和失败状态上端到端可信。

范围：

- 建立 Explain 专用 runner/prompt，不再作为通用 Close Read 的浅包装。
- 用真实任务验证 explanation language setting。
- 比较 quote、paragraph、neighborhood、document brief 等 context policy，选择满足质量的最小上下文。
- 默认不把全文作为 selection action 的无边界 payload。
- 客户端生成 `client_request_id`；SSE 保持 client/server request、trace、anchor identity 一致。
- 只有匹配的 `done` 才将 artifact 标为 complete；截断流成为 interrupted。
- Artifact 保存 source selector、context policy、model、prompt version 和 trace ID。
- 建立 grounding、focus、目标语言、帮助程度、context sufficiency 和 prompt injection eval。

验收：网络截断不产生 false complete；selection 切换不改变运行任务的 source；回答能回到唯一 passage；至少一组真实模型输出经过人工 review。

### Delivery 3：Alpha Reliability

启动条件：Delivery 2 达到可用于研究的质量。

只修复会污染用户验证的数据完整性问题：

- Reload 后把无 controller 的 `running` task 恢复为 `interrupted`。
- Storage 写入失败可见，不显示 false saved state。
- 为 request size、timeout、concurrency 和 stable error type 建立边界。
- 持续验证已实施的 API-key threat model、gateway isolation 与恢复流程。
- 在真实 desktop/mobile viewport 验证 selection、sheet/dialog、focus 和 interrupted stream。
- Observability 配置失败不能静默伪装成健康采集。

不建设 queue、RAG、agent kernel、collaboration，也不提前决定 IndexedDB 或 OPFS。

## Evidence Gates

| Gate | 必需证据 | 通过后才讨论 |
| --- | --- | --- |
| 1. Core Value | 首发用户/场景至少 3 个独立证据；core workflow 无 critical issue；Reliable Explain 通过 source、终态和人工质量 review；BYOK/import 不阻断核心用户。 | Narrow Beta。未通过时调整 persona、入口或核心 action。 |
| 2. Repeat Use | 1-2 周 beta 中自然出现第二篇文档、第二次 session、重开 artifact/note，并得到真实容量、离线和多设备需求。 | Local library、document revision、storage 选型、export/delete/migration/retention。 |
| 3. Learning Loop | 至少一种跨 session 行为比一次性 Explain 增加价值。 | Provenance inspector、feedback、review item、session summary；Translate/Vocab 是否进入主流程。 |
| 4. Proactive Assistance | Concierge difficulty preview 的打开、接受、dismiss、错误、帮助和成本数据。 | 自动触发、intervention budget、PreRead 与可检查 memory。 |
| 5. Durable Agent Infrastructure | durable background work 的明确需求。 | Queue、durable retry/cancellation、memory schema 或新的 agent orchestration。基础 auth/cloud persistence 已由明确产品决策提前交付。 |

## Deferred

对应 gate 通过前不做：

- Skill recommendation 或自动重排 selection toolbar。
- 自动 PreRead margin feed、persona engine、personal memory 或 planner。
- RAG、vector database、跨文档 knowledge graph。
- Multi-user collaboration、sharing permissions 和 organization accounts。
- Public sharing、public feed、rich-text note editor、WebSocket chat、E2E note encryption。
- PDF、EPUB、web-page ingestion 的生产实现；Discover 可以用低成本 prototype 验证入口。
- 为未来 agent 预先建设 LangGraph kernel。

## Just-In-Time Decisions

只在对应纵切启动时创建 ADR：

1. Delivery 1：anchor selector、offset encoding、context quote 和 ambiguity policy。
2. Delivery 2：Explain runner、context policy 和 SSE lifecycle。
3. Gate 2 后：local storage requirements 与 document revision。
4. Gate 4 后：proactive intervention policy。
5. Cloud persistence/auth：已完成 [ADR 0001](adr/0001-cloud-auth-and-reading-sessions.md)；Gate 5 后再决定 durable jobs。

## 每个纵切的 Definition of Done

- 用户 happy path 能端到端完成。
- 至少一个明显 failure path 可见且可恢复。
- 触及的 API contract 有自动测试。
- AI 行为有与风险相称的 model eval 或人工 review。
- 前端保持 typed、readable，并遵守 page、component、client-api 边界。
- 不混入无关重构、依赖升级或未来基础设施。
- 文档记录本切片验证了哪个 hypothesis，以及产生了什么 evidence。
- 相关验证命令通过；命令见项目 [README](../README.md#verification)。
