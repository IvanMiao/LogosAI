# LogosAI Project Reference

- 状态：Active，当前产品与工程事实的唯一参考
- 更新日期：2026-08-09
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
| 文本入口 | 支持 paste、`.txt`、`.md` 和 legacy history；多篇文本作为 Reading sessions 管理。 | 一个 session 同时只有一个 active document。 |
| Reader | 支持桌面/移动布局和字体、字号、行距偏好。 | 尚未经过正式可用性测试。 |
| Selection actions | 支持 Explain、Translate、Vocab、Note；普通拖选只显示操作菜单，确认动作后才保存 selection。 | source offset 来自真实 DOM range；无法唯一恢复的旧 anchor 不会静默猜测。 |
| Close Read | 支持 document 和 paragraph scope。 | 继续走 legacy `/api/analyze/stream`。 |
| Artifact | 支持 explanation、translation、vocabulary、close reading 和 note，并随 session 同步至 D1。 | 当前同步为 aggregate replacement，尚无冲突 UI。 |
| Streaming | 支持 stage、chunk、done、error，以及 stop、retry、partial output。 | Anchor flow 还没有 client request ID 和严格的截断恢复。 |
| 恢复 | D1 是 durable source of truth；user-scoped `localStorage` 是即时缓存与离线 fallback。 | 多设备并发修改目前 last-writer-wins。 |
| 登录 | Better Auth 支持 email/password；Google/GitHub 在配置 OAuth 凭据后启用。 | 尚未接入邮件验证与密码重置邮件服务。 |
| API key | 每用户在 Settings 中配置 Gemini key；Worker 以 AES-GCM 加密后写入 D1。 | 不提供端到端加密；AI 请求期间 Worker 需要短暂解密。 |
| Observability | Sentry 仅记录经过脱敏的错误事件。 | 尚未接入模型 trace、token usage 或 sink health。 |
| Eval | 有 Workspace Alpha JSONL dataset 和结构校验命令。 | 尚无真实模型评分或人工质量基线。 |
| Cloudflare | Worker 是 canonical app/API origin；D1 保存 auth、settings、preferences 与 reading sessions。 | Google/GitHub 仍需外部 OAuth app credentials。 |
| PostgreSQL | 仓库保留未接线的 SQLAlchemy scaffolding。 | 当前 Workspace、auth、history 和 API 都不依赖 PostgreSQL。 |

## 领域语言

后续代码、测试和文档统一使用以下概念：

| 概念 | 含义 |
| --- | --- |
| `Document` | 一份原始文本及其本地 identity、title、source type。 |
| `Reading session` | 一份 Document 及其 anchors、notes、AI artifacts 的 durable aggregate。 |
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
Browser (React)
├── /login, /register           Better Auth client
├── /app                        Workspace + user-scoped local cache
├── /app/settings               Cloud model/key settings
└── /api/*                      same-origin requests
      │
      ▼
Cloudflare Worker (Hono)
├── static React assets          served from Worker Assets
├── /api/auth/*                 Better Auth → D1
├── /api/account|workspace|reading-sessions → D1
├── allowlisted AI routes       decrypt user key → FastAPI on Fly

FastAPI AI request
  → TextAnalysisLangchain.analyze_stream
  → detect → correct? → interpret
  → SSE stage/chunk/done/error
  → Artifact state → local cache → debounced D1 session sync
```

前端组件不直接调用后端；请求集中在 `frontend/client-api/`。页面 hook 编排用户流程，`features/anchors` 和 `features/artifacts` 保存领域逻辑，presentational components 只接收 typed props。

FastAPI 只提供受 Cloudflare gateway 保护的 AI `/api/*` 路由。生产浏览器入口与静态 React assets 都由 Cloudflare Worker 提供；开发时 Vite 将 `/api/*` 代理到本地 Worker，再由 Worker 只把 allowlisted AI routes 转发到 FastAPI。详细决策见 [ADR 0001](adr/0001-cloud-auth-and-reading-sessions.md)。

## API 与模型契约

浏览器不再发送 `X-Gemini-Key`。Worker 根据 authenticated user 解密其 key，向 FastAPI 添加该 header；生产 FastAPI 同时校验 `X-LogosAI-Gateway`。允许的主模型为 `gemini-2.5-flash` 和 `gemini-2.5-pro`。FastAPI 不保存 key。

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

- Better Auth identity、user settings、reader preferences、document、anchor 与 artifact 以 user ID 隔离后存入 Cloudflare D1。
- Browser `localStorage` 只保留 user-scoped 工作缓存；首次登录用户可认领旧版未分 scope 的本地数据，其他账号不能继承。
- Gemini key 使用 AES-256-GCM、随机 IV 和 user ID associated data 加密；读取设置只返回是否存在及末四位 hint。
- OAuth token 使用 Better Auth token encryption。Source text 与 note 依赖 Cloudflare platform encryption at rest，不是 E2E encryption。
- 一个用户可保留多个 reading sessions；删除 session 会级联其 anchors 与 artifacts。
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
- 先建设 Assistant Kernel、PostgreSQL/pgvector/Redis、R2/Vectorize、RAG、queue 或 collaboration platform。
- 在真实文档分布出现前固定长文阈值、chunking、digest 或 storage 技术。
- 立即建设 persona、memory、skill marketplace、auto recommendation、PreReadAgent 或 planner。
- 在真实分享需求出现前承诺 E2E note encryption、public feed 或 collaboration schema。
- 为实现未来能力而提前改写所有目录、API 或 LangGraph orchestration。

2026-08-09 产品负责人明确要求登录与 Cloudflare durable sessions，因此这一纵切取代了旧文档中“Gate 5 前不做 cloud auth”的限制；它是产品方向决策，不被错误记录成已经获得 repeat-use evidence。

这些能力可以作为 hypothesis 重新进入 [ROADMAP.md](ROADMAP.md)，但必须先满足相应 evidence gate，并在启动纵切时做 just-in-time ADR。
