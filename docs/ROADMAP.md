# LogosAI Roadmap

- 状态: working roadmap
- 更新日期: 2026-06-30
- 来源文档: `README.md`, `docs/plans/2026-03-18-assistant-first-companion-design.md`, `docs/plans/2026-03-20-agentic-reading-system-spec.md`, `docs/plans/2026-04-07-agentic-reading-deep-design.md`, `docs/plans/2026-04-07-agentic-reading-execution-plan.md`, `docs/plans/2026-04-12-agentic-reading-phase1-backend-contract.md`, `docs/plans/2026-04-17-agentic-reading-master-plan.md`, `docs/plans/2026-05-25-workspace-alpha-ui-decisions.md`, `docs/plans/2026-06-08-workspace-alpha-ui-spec.md`, `docs/plans/2026-06-08-workspace-alpha-visual-design.md`。

## 产品方向

LogosAI 要从一次性文本分析表单，收敛成以文本为中心的 AI 阅读工作区。

第一版可交付目标是 `Workspace Alpha`：

1. 打开或粘贴一段文本。
2. 在安静的 reader surface 中阅读。
3. 选择有意义的句子、段落或片段。
4. 把 AI 输出和个人笔记挂到对应文本位置。
5. 刷新后仍能恢复文档、标记、输出和阅读偏好。

不要先做 memory、账号、云端文档库、RAG 或自主规划 agent。它们都依赖一个稳定的 anchor 和 artifact 模型。

## 不变量

1. 文本是产品中心，主界面不是 prompt box。
2. 每个 AI 输出和笔记都必须挂到 document、paragraph 或 selection。
3. `anchor_id` 是实现细节。界面展示 `Selection`、`Paragraph`、`Document`、`Note`、`Highlight` 或 `Artifact`。
4. `Artifact` 是 explanation、translation、vocabulary、close reading 和 note 的统一产物模型。
5. 现有 Close Read 的输出质量必须保留。不要为了 UI 方便强迫它输出固定 JSON 或固定章节。
6. 保留 neo-brutalism，但把强视觉重量放在 chrome、controls 和 active object。长文本阅读区要安静。
7. Phase 1-2 尽量 local-first。不要过早引入数据库、鉴权、memory、RAG 或完整 agent kernel。
8. 新路径通过测试前，保持现有 `/api/analyze/stream` 稳定。
9. Agent 可观测性不依赖 LangGraph。Orchestration 可以是普通 Python workflow；trace、eval、prompt version 和 cost/latency 记录必须作为独立工程契约存在。

## 外部参考模板

这些是可落地的界面和交互参考，不是要完整复制。

| 参考 | 借鉴点 | 落到 LogosAI |
| --- | --- | --- |
| [Readwise Reader](https://readwise.io/read) | 阅读、highlight、annotation、keyboard-heavy reader、AI copilot 的组合。 | 把 highlight 和 note 当成阅读动作，不再当成历史记录附属品。 |
| [Google NotebookLM](https://blog.google/innovation-and-ai/technology/ai/notebooklm-google-ai/) | Source-grounded assistant、summary、question、citation 和回答校验。 | AI 产物必须能回到源文本，之后再做 provenance 检视。 |
| [LiquidText](https://www.liquidtext.net/) | 文档阅读、摘录、笔记和来源上下文之间的连接。 | 使用边距 mark 和 context link 保持“输出来自哪里”的关系。 |
| [Hypothesis client](https://github.com/hypothesis/client) | 开源 web annotation client 和 annotation sidebar。 | 借鉴“文本锚定 + 侧栏对象视图”，不要把所有产物堆成 history。 |
| [Zotero reader](https://github.com/zotero/reader) | 开源 PDF/EPUB/HTML reader 和 annotator。 | Reader 状态、annotation 状态、全局导航要分开。 |
| [Outline](https://github.com/outline/outline) | 高质量 React knowledge-base shell、Markdown 内容和测试习惯。 | 借鉴安静文档结构、清晰导航、关键 workflow 测试。 |
| [AFFiNE](https://github.com/toeverything/AFFiNE) | 开源 all-in-one knowledge workspace。 | 仅作为后续文档库、知识库和白板扩展参考，不放进 Alpha。 |
| [Neobrutalism components](https://www.neobrutalism.dev/) 和 [GitHub repo](https://github.com/ekmas/neobrutalism-components) | Tailwind/shadcn 风格的 neo-brutalist 组件词汇。 | 借鉴 border、hard shadow、icon button 和状态；不要复制它的高噪音整页密度。 |

## Agent 可读的界面定义

后续代码、测试和文档统一使用这些界面对象名。

```text
WorkspacePage
├── GlobalAppBar
│   ├── BrandControl
│   ├── ApiKeyStatusButton
│   └── AppMenu
├── ImportPanel
│   ├── PasteTextAction
│   └── OpenTextFileAction
└── ReaderWorkspace
    ├── ReaderToolbar
    │   ├── DocumentTitle
    │   ├── DocumentMeta
    │   ├── ReadingSettingsButton
    │   ├── ContextPanelToggle
    │   └── DocumentMenu
    ├── ReadingSurface
    │   ├── ParagraphBlock[]
    │   ├── ParagraphMarginAction[]
    │   ├── SelectionToolbar
    │   └── AnchorMark[]
    └── ContextPanel
        ├── SessionDashboard
        └── ActiveAnchorView
            ├── ActiveAnchorHeader
            ├── ActiveArtifact
            └── PastArtifactList
```

状态归属：

| 状态 | Owner | 说明 |
| --- | --- | --- |
| `activeDocument` | `WorkspacePage` | `null` 表示 import state。 |
| `readerPreferences` | `ReaderWorkspace` | Font、size、spacing，本地持久化。 |
| `activeAnchorId` | `WorkspacePage` | UI 同一时间只有一个 active anchor。 |
| `anchorsById` | `features/anchors` | 存 quote、normalized hash、offset 和 scope。 |
| `artifactsByAnchorId` | `features/artifacts` | 包含 AI outputs 和 notes。 |
| `tasksByRequestId` | `features/artifacts` | 跟踪 streaming、stopped、failed、complete。 |
| `legacyHistory` | `features/history` | 现有 analysis history，显示在 workspace 外。 |

视觉 token 责任：

| Token group | 责任 |
| --- | --- |
| `reader.*` | 安静的阅读表面，无 hard shadow，恢复正常 font smoothing。 |
| `chrome.*` | App bar、toolbar、menu、icon button，承载主要 neo-brutalist 身份。 |
| `context.*` | 连续侧栏或 mobile sheet，中等视觉重量。 |
| `accent.primary` | Primary action 和 active object。 |
| `accent.selection` | 选区、当前 passage、context navigation。 |
| `accent.warning` | Missing key 和非阻塞提醒。 |
| `accent.error` | 失败 artifact 和 destructive action。 |
| `shadow.control` | 普通控制的小 hard shadow。 |
| `shadow.overlay` | Floating surface 的更强 hard shadow。 |

给后续 agent 的界面规则：

1. Workspace 不再新增泛化 `HomePage`，使用 `pages/workspace`。
2. Presentational component 不直接调用后端。
3. Reader 不放进 heavy card。
4. Context Panel 不做 cards inside cards。
5. 不显示 `ANCHOR_ID`、`EXPLAIN_OUTPUT`、`RAW_CONTENT` 这类实现标签。
6. close、copy、menu、panel toggle、settings、retry、stop、delete 使用 icon button。
7. 可见控制必须有真实状态：enabled、disabled with reason、loading、failed 或 complete。

## Agent 可观测与评估契约

后端可以直接使用 Gemini SDK 或后续 Gemini Interactions API。不要为了可观测性保留 LangGraph；可观测性由显式 trace/span、日志、eval dataset 和 feedback loop 保证。

推荐边界：

```text
backend/
  observability/
    client.py              # ObservabilityClient protocol
    noop.py                # local/dev fallback
    langfuse.py            # optional first adapter
    phoenix.py             # optional alternate adapter
```

每个用户触发的 AI action 必须产生一个 trace：

| 字段 | 说明 |
| --- | --- |
| `trace_id` | 一次用户 action 的全链路 ID。 |
| `request_id` | 一次 SSE request 的 ID，必须出现在每个 SSE event。 |
| `user_action` | `explain`、`translate`、`vocab`、`close_read` 等。 |
| `document_id` | 本地或服务端 document ID。 |
| `anchor_id` | anchor action 必填；document-level action 可为空。 |
| `artifact_id` | 产物创建后回填。 |
| `model` | 实际调用的模型。 |
| `prompt_version` | prompt 模板版本或 `prompt_hash`。 |
| `input_token_count` | 可用时记录；不可用时为 `unknown`。 |
| `output_token_count` | 可用时记录；不可用时为 `unknown`。 |
| `first_token_latency_ms` | streaming action 必填。 |
| `total_latency_ms` | action 总耗时。 |
| `status` | `success`、`stopped`、`error`。 |
| `error_type` | 失败时记录稳定错误类型，不只记录自由文本。 |

每个 trace 至少包含这些 span：

```text
workspace.action
anchor.resolve
skill.run
llm.detect
llm.correct
llm.interpret / llm.explain / llm.translate / llm.vocab
sse.stream
artifact.persist
```

安全边界：

1. 不记录用户 Gemini API key。
2. 默认不把完整原文写入第三方 observability 平台。
3. 可以记录短 quote、hash、长度、语言、genre、prompt version、model、latency、token usage、error type。
4. 调试环境如需记录完整 prompt/response，必须有显式开关，并在文档中标注。

最小 eval dataset：

| 字段 | 说明 |
| --- | --- |
| `source_text` | 评估样例文本。 |
| `anchor_quote` | 被解释或翻译的选区。 |
| `skill` | 被测 skill。 |
| `target_language` | 目标语言。 |
| `expected_properties` | 应满足的性质。 |
| `failure_modes` | 常见坏输出样例或禁止行为。 |

首批 eval 维度：

1. 忠于原文，不编造上下文。
2. 回答聚焦选区，而不是泛泛总结全文。
3. 遵守目标语言。
4. 对复杂句、术语或论证结构有实际帮助。
5. Close Read 保持 coherent lecture-style 输出质量。
6. 错误、停止、重试不会污染 artifact 状态。

## Roadmap

每一步都应该是一个可单独 review、可回退的纵切。

### Step 0: 固化路线图

范围: 文档。

交付物：

- `docs/ROADMAP.md` 存在，并链接旧计划和外部界面参考。
- `README.md` 指向本 roadmap。
- 文档定义目标界面对象、状态 owner 和视觉 token 责任。
- 文档定义 agent trace、span、eval dataset 和隐私边界。

验证：

- 新 agent 不必读完所有旧计划，也能识别下一步实现任务。
- 无运行时代码变化。

### Step 1: Workspace Shell

范围: 前端布局，不接 AI。

交付物：

- 新增 `frontend/pages/workspace/WorkspacePage.tsx` 和 `useWorkspace.ts`。
- `/app` 指向 `WorkspacePage`；旧 analysis page 只在需要 fallback 时保留入口。
- Workspace 内使用 compact `GlobalAppBar`，不再使用大 header card。
- 显示 `ImportPanel`、空 `ReadingSurface`、空 `ContextPanel`。
- Settings 和 About 路由仍可用。

验证：

- Desktop 显示 app bar、reader region、context panel。
- Mobile 显示 app bar 和单列 reader region。
- 默认 workspace 不出现长期驻留的 analysis textarea。
- 在 `frontend/` 运行 `npm run lint`、`npm test`、`npm run build`。

### Step 2: 本地文档导入和阅读偏好

范围: 本地文档状态，不接 AI。

交付物：

- 粘贴文本后生成本地 `activeDocument`。
- 支持本地打开 `.txt` 和 `.md`。
- `activeDocument` 和 `readerPreferences` 持久化到 localStorage。
- 文档渲染在 `720-820px` 的 bounded reading column。
- 支持 font、size、spacing 控制。

验证：

- 粘贴或打开文件后进入 Reader state。
- 刷新后恢复文档和阅读偏好。
- Reader 文本恢复正常 font smoothing，且不在 heavy card 内。
- 至少一个单元测试覆盖 local document persistence。

### Step 3: Selection 和 Anchor Core

范围: 文本选择、anchor 模型和测试。

交付物：

- 新增 `features/anchors` 或当前目录结构下等价边界：
  - `anchor.types.ts`
  - `createAnchorFromSelection`
  - `resolveAnchor`
  - `normalizeAnchorQuote`
- 选中文本后创建本地 anchor，包含 quote、normalized hash、offset 和 scope。
- Desktop selection toolbar 在选区附近出现，先提供 `Explain` 和 `Note`。
- Mobile selection 使用 bottom action sheet。

验证：

- 选择文本后只产生一个 active anchor。
- 清除浏览器选区不会删除 `activeAnchorId`。
- 文本未变化时，刷新后 anchor 可恢复。
- 单元测试覆盖 quote normalization 和 resolve failure。

### Step 4: 本地 Notes 和 Artifact Panel

范围: 不依赖后端的 artifact。

交付物：

- 新增 `features/artifacts` 或当前目录结构下等价边界，包含 `Artifact`、`NoteArtifact` 和 local persistence。
- `Note` 在 `ContextPanel` 中创建 anchored draft。
- Note draft 按 anchor 自动保存。
- `ActiveArtifact` 只展示一个主产物，`PastArtifactList` 使用 compact list。
- `AnchorMark` 展示 saved、draft、active 状态。

验证：

- 创建 note，切换 selection，再返回，draft 仍存在。
- 刷新后恢复 document、anchor、mark 和 note。
- Context Panel 不堆叠大型 card。
- 至少一个自动测试覆盖 note flow。

### Step 5: Close Read 作为 Streaming Artifact

范围: 复用现有 `/api/analyze/stream`。

交付物：

- 增加 document-level `Close Read Document`。
- 增加 paragraph-level `Close Read Paragraph`。
- 使用现有 `streamAnalysis` 把输出流式写入 `ActiveArtifact`。
- Stop 或失败时保留 partial content。
- Missing API key、retry、stop、error 都显示在当前 artifact 内。

验证：

- Close Read 可以流式输出且不跳转页面。
- Streaming 时 Reader 仍可交互。
- 失败不会清空文档或已有 artifacts。
- Close Read Markdown 以 prose 渲染，不使用 monospace system output。

### Step 6: 后端 Anchor Explain 契约

范围: 后端 additive API。

交付物：

- 新增 Pydantic schemas：`DocumentPayload`、`TextAnchorPayload`、`AnchorExplainRequest`。
- 新增 `POST /api/anchors/explain`。
- 内部复用现有 `TextAnalysisLangchain` streaming path。
- 每个 SSE event 都包含 `request_id`、`trace_id` 和 `anchor_id`。
- 新增最小 `ObservabilityClient` protocol，默认实现为 no-op。
- 为 `/api/anchors/explain` 记录 `workspace.action`、`skill.run`、`llm.*`、`sse.stream` span。
- 保持 `/api/analyze/stream` 不变。

验证：

- 后端测试覆盖 happy path、correction path、missing key、unsupported model、error event。
- 协议不变量测试：`done.result` 等于所有 `chunk.delta` 拼接。
- 测试确认每个 SSE event 都包含 `request_id`、`trace_id` 和 `anchor_id`。
- 测试确认 no-op observability 不影响 API 行为。
- Curl 能从 `/api/anchors/explain` 看到 `stage`、`chunk`、`done`。

### Step 7: Explain 使用 Anchored API

范围: 一个 AI action 的前端集成。

交付物：

- 新增 `client-api/anchorApi.ts`。
- `Explain` 把 active document 和 active anchor 发给 `/api/anchors/explain`。
- Running task state 按 `request_id` 归属，不按当前 selection 归属。
- 前端 task 也保存 `trace_id`，用于错误反馈和后续 eval 回放。
- Streaming 中切换 selection 不会把结果挂到新 anchor。

验证：

- 在 anchor A 启动 Explain，streaming 时选择 anchor B，完成后 artifact 仍归 anchor A。
- Context Panel 折叠时，Explain 启动会自动打开。
- Error 和 retry 仍挂在原 anchor。
- 用户可在错误状态中复制 `trace_id`，但界面不常驻展示调试 ID。
- 至少一个自动测试覆盖 streaming 中切换 selection。

### Step 8: Translate 和 Vocab

范围: 增加两个 skill，但仍不做完整 agent kernel。

交付物：

- Selection toolbar 增加 `Translate` 和 `Vocab`。
- 前端在需要时把 `/api/anchors/explain` 包成 `runAnchorSkill`。
- 后端可新增 `/api/anchors/run`，支持 `skill in {"explain", "translate", "vocab"}`。
- 输出按 `artifact_type` 持久化。

验证：

- 三个 skill 分别展示自然标签：`Explanation`、`Translation`、`Vocabulary`。
- Artifact type 通过 label 和 icon 表示，不给每个 skill 固定大色块。
- 后端拒绝 unsupported skill。
- 测试覆盖一个 success path 和一个 unsupported-skill path。

### Step 9: Observability 和 Eval Baseline

范围: 最小可观测和评估闭环，不改变用户主流程。

交付物：

- 选择一个首选 observability sink：优先 Langfuse 或 Phoenix；未配置时使用 no-op。
- 所有 anchor skill action 都写入统一 trace schema。
- 记录 prompt version 或 prompt hash。
- 记录 first token latency、total latency、status、error type。
- 建立 `docs/evals/` 或等价位置，存放 20-50 条真实阅读 eval 样例。
- 加一个可在 CI 或本地运行的最小 eval 命令，先覆盖 `explain` 和 `close_read`。

验证：

- 未配置 observability provider 时，产品功能不降级。
- 配置 provider 后，一个 Explain 请求能看到完整 trace 和关键 spans。
- 强制失败时 trace 标记为 `error`，并带稳定 `error_type`。
- Eval 命令能输出 pass/fail 和失败样例摘要。
- Eval 不要求访问用户真实私有文档或用户 Gemini API key。

### Step 10: Workspace Alpha Hardening

范围: 完成 Alpha 验收边界。

交付物：

- Legacy History 移到 drawer 或 sheet，并支持 `Open as document`。
- `GlobalAppBar` 有 compact API key status。
- Selection actions 有键盘可达路径。
- Mobile sheet 和 drawer 有 focus trap 和 restore。
- 加 desktop/mobile viewport 检查。

验证：

- Critical flow 通过：import、read、select、explain、切换 selection、note、refresh、restore。
- Failure flow 通过：missing key 或强制 request error 不阻塞阅读。
- 支持的 viewport 中没有文字重叠、控制溢出或明显 layout shift。
- 在 `frontend/` 运行 `npm run lint`、`npm test`、`npm run build`。

### Step 11: Document Library 和 Brief

范围: 只在 Workspace Alpha 之后启动。

交付物：

- 先做本地 document list；除非明确需要多设备，否则先不接云端持久化。
- `document_brief` 是用户可见、可编辑的 artifact。
- 长文才生成 chapter 或 section digest。
- Brief regeneration 必须由用户显式触发。

验证：

- 用户可重新打开至少 3 个本地文档。
- Brief 可查看、可编辑。
- 删除 document 会删除它的本地 anchors 和 artifacts。
- 长文不会阻塞初始 Reader rendering。

### Step 12: Skill Recommendation

范围: 第一个可见的 agentic 行为。

交付物：

- 为 active selection 增加 lightweight recommender，推荐一个 skill。
- Recommendation 不延迟 toolbar 出现。
- 用户决定是否运行建议 skill。
- 在 memory 存在前，declined suggestion 只作为本地 telemetry。

验证：

- Toolbar 在 recommendation 完成前立即出现。
- Suggested skill 可接受、可忽略。
- Explain、Translate、Vocab 仍可手动选择。
- Recommendation 失败不影响阅读和手动 action。
- Recommendation 必须进入 trace，记录推荐 skill、置信度、用户是否接受。

### Step 13: Persistence、Memory 和 PreReadAgent

范围: 只在 Alpha 和本地文档库稳定之后启动。

交付物：

- 为 documents、anchors、artifacts、reading sessions 增加 authenticated persistence。
- Memory 可检视、可删除，并带 confidence、evidence count、freshness。
- `PreReadAgent` 先只处理一个 document section。
- PreRead 输出是挂在 margin 的 draft artifact，默认隐藏。

验证：

- 持久化 artifact 在 reload 和 re-login 后仍指向同一 source anchor。
- Memory entry 可查看、可删除。
- PreRead 为一个 section 生成 3-5 个 draft artifacts，且不阻塞 Reader。
- 用户 dismiss draft 不改变源文本或已保存 notes。
- PreReadAgent 每个 draft artifact 都能追溯到 trace、source section 和 prompt version。

## 暂缓事项

Workspace Alpha Hardening 完成前不要排这些：

- PDF 或 web-page ingestion。
- 多用户协作。
- Public sharing 或 public feed。
- Rich-text note editor。
- Full planner agent。
- 大型云端文档库上的 RAG。
- WebSocket chat。
- End-to-end note encryption。

## 验证命令

前端改动：

```bash
cd frontend
npm run lint
npm test
npm run build
```

后端改动：

```bash
cd backend
uv run pytest
uv run ruff check .
```
