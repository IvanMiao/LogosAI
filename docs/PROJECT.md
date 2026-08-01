# LogosAI Project Reference

- 状态：Active，当前产品与工程事实的唯一参考
- 更新日期：2026-07-19
- 实施顺序：[ROADMAP.md](ROADMAP.md)

本文档记录 LogosAI 现在是什么、代码如何工作，以及跨版本保持稳定的产品和工程边界。它不承诺未来功能，也不定义优先级。

## 产品边界

LogosAI 正在探索 source-grounded AI reading assistance：读者在困难文本中遇到理解阻力时，应能在原文上下文内获得帮助，并能回到帮助所依据的 passage。

候选核心任务是：

> 不离开当前文本理解一个困难片段，然后继续阅读；需要时，保存可重新找到的解释或个人笔记。

已经接受的原则：

1. 文本是核心领域对象，不是 prompt box 的附件。
2. AI 输出必须能追溯到 selection、paragraph 或 document。
3. 用户笔记是第一等内容，不是 AI history 的附属品。
4. Assistant 默认保持安静；用户表达意图后再出现工具和结果。

以下仍是假设，不是产品事实：首发用户是谁、用户是否愿意导入全文、BYOK 是否可接受、内置 Reader 是否是最佳载体、保存行为是否带来复用、PreRead 是否比按需帮助更有价值。

## 当前能力

| 能力 | 当前状态 | 已知边界 |
| --- | --- | --- |
| 文本入口 | 支持 paste、`.txt`、`.md` 和 legacy history。 | 同时只有一个 active document。 |
| Reader | 支持桌面/移动布局和字体、字号、行距偏好。 | 尚未经过正式可用性测试。 |
| Selection actions | 支持 Explain、Translate、Vocab、Note。 | 选区定位仍以首个 normalized quote 反查，重复文本可能错位。 |
| Close Read | 支持 document 和 paragraph scope。 | 继续走 legacy `/api/analyze/stream`。 |
| Artifact | 支持 explanation、translation、vocabulary、close reading 和 note。 | 只有浏览器本地存储，无 document revision。 |
| Streaming | 支持 stage、chunk、done、error，以及 stop、retry、partial output。 | Anchor flow 还没有 client request ID 和严格的截断恢复。 |
| 恢复 | document、anchor、artifact、preference 和 history 使用 `localStorage`。 | 换文档会清空当前 anchors 与 artifacts；storage failure 仍可能不可见。 |
| API key | 用户在 Settings 中提供 Gemini key。 | key 保存在浏览器 `localStorage`，每次请求通过 header 发送。 |
| Observability | 有 no-op protocol 和 Langfuse adapter 骨架。 | sink 健康状态、完整 span 和 token usage 尚未验证。 |
| Eval | 有 Workspace Alpha JSONL dataset 和结构校验命令。 | 尚无真实模型评分或人工质量基线。 |
| PostgreSQL | 仓库保留未接线的 SQLAlchemy scaffolding。 | 当前 Workspace、history 和 API 都不依赖数据库。 |

## 领域语言

后续代码、测试和文档统一使用以下概念：

| 概念 | 含义 |
| --- | --- |
| `Document` | 一份原始文本及其本地 identity、title、source type。 |
| `Anchor` | 指向 source range 的内部坐标；用户界面不显示 “anchor” 一词。 |
| `Artifact` | 挂在 source object 上的 AI output 或 user note。 |
| `Task` | 一次 streaming action 的运行状态与 request identity。 |
| `Close Read` | 保留连续 lecture-style 质量的深度讲解。 |
| `Skill` | Explain、Translate、Vocab 等用户触发的 AI 动作。 |
| `Context Panel` | 当前 document/anchor 和 active artifact 的对象视图。 |
| `Legacy analysis` | 旧的一次性全文分析记录，不等于 document 或 artifact。 |

Anchor 是用户意图、原文和 artifact 的共享坐标系。当前形状包括 `documentId`、`scope`、`quote`、normalized quote/hash、start/end offset。Offset 应来自真实 DOM range；quote 与少量上下文用于恢复和检测 ambiguity，不能在重复文本中静默猜测。

Artifact 统一处理 AI 和用户产物，但 ownership 不同：AI 可以新建 explanation，不能覆盖用户 note。未来如加入 provenance，应至少记录 source selector、skill、model、prompt version、context policy 和 trace identity。

## 交互与视觉不变量

以下结论来自 Workspace Alpha 设计，并继续有效：

1. Reader 是默认表面；import/editor 是进入 Reader 前的状态，不与 Reader 长期并列。
2. Selection toolbar 立即显示 Explain、Translate、Vocab、Note，不等待模型 recommendation。
3. Close Read 是较重的 document、paragraph 或 passage action，不占据默认短选区 toolbar。
4. Context Panel 显示一个 active artifact 和紧凑的 past outputs，不成为大型工具启动器。
5. Selection 改变时，后台 task 仍绑定原 anchor；note draft 不能因切换而丢失。
6. Loading、stop、error、retry 和 missing-key 状态局部显示，不能阻塞阅读。
7. Close Read 接受自然 Markdown，不为 UI 强制固定 JSON 或固定章节。
8. 桌面以 Reader + 可调整结果区为主；移动端保持单列 Reader，以 dialog/sheet 显示 action 和 artifact。
9. Neo-brutalist identity 集中在 chrome、control 和 active object；长文区保持安静。
10. Mono 用于品牌、控制和系统状态；source text 与长输出使用阅读字体。
11. 状态不能只靠颜色；icon control 必须有 accessible name，hover action 也必须可 focus。

## 当前架构

```text
Browser
├── /app                       WorkspacePage
│   ├── useWorkspace           orchestration and local state
│   ├── features/anchors       anchor creation, resolution, persistence
│   ├── features/artifacts     artifact/task state and persistence
│   └── client-api             SSE clients
├── /app/analysis              legacy one-shot analysis
├── /app/settings              Gemini key and model
└── /app/about

Selection skill
  → POST /api/anchors/run
  → TextAnalysisLangchain.analyze_stream
  → detect → correct? → interpret
  → SSE stage/chunk/done/error
  → artifact state → localStorage

Document/paragraph Close Read
  → POST /api/analyze/stream
  → same LLM workflow
  → SSE → artifact state → localStorage
```

前端组件不直接调用后端；请求集中在 `frontend/client-api/`。页面 hook 编排用户流程，`features/anchors` 和 `features/artifacts` 保存领域逻辑，presentational components 只接收 typed props。

FastAPI 同时提供 `/api/*` 和生产 frontend bundle。开发时由 Vite 代理 API；Docker 和 Fly 使用同一容器，由 FastAPI 服务构建后的静态资源。

## API 与模型契约

所有 AI 请求使用 `X-Gemini-Key`，允许的主模型为 `gemini-2.5-flash` 和 `gemini-2.5-pro`。服务端不保存 key。

### Anchor skill

`POST /api/anchors/run` 接收：

```json
{
  "document": { "id": "...", "title": "...", "text": "..." },
  "anchor": {
    "id": "...",
    "quote": "...",
    "start_offset": 0,
    "end_offset": 10,
    "scope": "selection"
  },
  "skill": "explain",
  "user_language": "EN",
  "model": "gemini-2.5-flash"
}
```

`scope` 为 `document | paragraph | selection`，`skill` 为 `explain | translate | vocab`。`POST /api/anchors/explain` 是 explain-only 兼容入口。

Anchor SSE 的 `stage`、`chunk`、`done`、`error` payload 都必须保持同一 `request_id`、`trace_id`、`anchor_id`。`chunk.delta` 是增量；只有匹配的 `done` 才能完成 artifact；`error` 后不能再有 `done`。

### Close Read 与 legacy analysis

- `POST /api/analyze/stream`：流式 Close Read 和旧分析路径。
- `POST /api/analyze`：同步兼容路径。

该路径使用 `stage | chunk | done | error`，但目前没有 anchor、request 和 trace identity。

### LLM workflow

`TextAnalysisLangchain` 使用 Flash Lite 检测语言、genre 和 correction need，必要时纠错，再由配置的 Flash/Pro 生成连续讲解。Streaming 直接执行这一流程；同步接口使用等价 LangGraph。

当前 Explain、Translate、Vocab 只是给同一通用 workflow 增加不同 task instruction，并默认把全文作为上下文。它们尚不是经过独立 prompt、context policy 和 eval 验证的稳定 skill semantics。

## 数据、安全与可观测性

- 当前 document、anchor、artifact、task、history、reader preference、model 和 Gemini key 都在 browser `localStorage`。
- 新 document 会替换 active document，并清除当前 anchor/artifact storage；不存在多文档 library。
- 默认不应向第三方 telemetry 上传 API key、完整原文、完整 prompt 或私人 note。
- Source text 是不可信数据，必须与 system instruction 分隔。当前没有 tool execution，因此 prompt injection 主要是 grounding 和输出质量风险。
- Memory 如果未来实现，必须可检查、可删除，并记录 evidence、confidence 和 freshness；当前不实现隐形 personal memory。

每个成熟的 AI action 最终应记录：client/server request ID、trace ID、document/anchor identity、skill、model、prompt version、context policy、first-token/total latency、token usage 或 `unknown`、稳定终态与 error type。

评估分三层，不能互相替代：

1. Contract tests：anchor identity、SSE ordering、done/error exclusivity、storage、stop 和 retry。
2. Model eval：grounding、selection focus、目标语言、帮助程度、context sufficiency 和禁止行为。
3. Human review：使用真实阅读文本判断帮助是否解决阅读阻力。

Workspace 已被测试保护的交互旅程以
[Workspace Journey UX Contract](ux/workspace-journey-contract.md) 为评审参考。该文档与
`frontend/tests/workspace/workspaceJourney.test.tsx` 必须在同一次变更中同步更新。

## 已废止的旧结论

以下旧方案不再具有实施授权：

- 预先确定中高级语言学习者、内置 Reader 或 BYOK 一定是首发方案。
- 先建设 Assistant Kernel、PostgreSQL/pgvector/Redis、Cloudflare D1/R2/Vectorize、Clerk、RAG、queue 或 cloud document library。
- 在真实文档分布出现前固定长文阈值、chunking、digest 或 storage 技术。
- 立即建设 persona、memory、skill marketplace、auto recommendation、PreReadAgent 或 planner。
- 在真实分享需求出现前承诺 E2E note encryption、public feed 或 collaboration schema。
- 为实现未来能力而提前改写所有目录、API 或 LangGraph orchestration。

这些能力可以作为 hypothesis 重新进入 [ROADMAP.md](ROADMAP.md)，但必须先满足相应 evidence gate，并在启动纵切时做 just-in-time ADR。
