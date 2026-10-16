# LogosAI Project Reference

- 状态：Active，当前产品与工程参考
- 核对：2026-09-19，同步主线的云写入保护与已记录验收；本次未重跑生产验收
- 下一步、用户证据与待决设计：[路线图](roadmap.md)

## 产品边界

LogosAI 帮助读者在原文上下文中理解困难片段，并保存可回到原文的解释和笔记。
文本是核心对象；AI 输出关联原文；AI 不覆盖用户笔记。当前版本以用户主动触发帮助为主，
personal memory、主动推荐与自动 agent 工作流的启动条件见[路线图](roadmap.md)。

## 当前能力与限制

| 能力 | 已实现 | 尚未验证或已知限制 |
| --- | --- | --- |
| 文本入口 | Paste、`.txt`、`.md`、legacy history 导入；多个 reading sessions | 每个 session 对应一份原文；首发人群和最佳导入方式待验证 |
| Reader | 桌面默认双栏；source / split / analysis 布局与 History 分离；阅读偏好可调 | 2026-09-15 基线真实服务与用户 Firefox 200% 验收通过；后续 UI 改动按 PR 验证 |
| Selection | Explain、Translate、Vocab、Note；确认动作后保存选区 | DOM Range 提供真实 offset；旧 anchor 无法唯一恢复时不猜测；前后文 selector 尚未独立建模 |
| Close Reading | 工作区提供整篇精读；段落动作归为 Explain | 仍使用 legacy analysis stream；旧接口与 history 导入保留兼容 |
| Artifact | 解释、翻译、词汇、精读和笔记随 session 同步 | model、prompt version、context policy 尚未作为完整 provenance 保存 |
| Streaming | Anchor done/identity 校验；截断保留部分输出并标为 failed；stop/retry；重载后 running 恢复为 stopped | 真实服务与受控断流验收通过；本地 request ID 尚未作为 client_request_id 贯穿协议 |
| 数据恢复 | D1、用户隔离的 localStorage、同步 journal、本地删除 tombstone、失败重试 | revision 条件写入保护整包保存；内容基准支持独立修改合并，重叠修改在原阅读中复核，见旅程契约 |
| 登录与 key | Better Auth email/password；OAuth 按凭据启用；Worker 加密保存用户 Gemini key | 生产 OAuth 配置未核实；尚无邮件验证/密码重置邮件服务 |
| 监控 | 前端、Worker、FastAPI Sentry；后端 LLM spans、耗时、首 token 延迟及 usage 记录 | 采样、模型 usage 完整性与 sink health 不由代码存在保证 |
| 评估 | Workspace Alpha JSONL 与结构校验程序 | 不运行真实模型，不证明生成质量 |

精确选区已有[实现](../frontend/features/anchors/selection-offsets.ts)、
[重复文本/歧义测试](../frontend/tests/anchors/anchor-core.test.ts)及
[跨段/Unicode 测试](../frontend/tests/anchors/selection-offsets.test.ts)。
交互以[旅程契约](ux/workspace-journey-contract.md)为准。

## 领域语言

| 概念 | 含义 |
| --- | --- |
| Document | 一份原始文本、identity、title 和 source type |
| Reading session | 一份 Document 及其 anchors、notes、AI artifacts 的持久化集合 |
| Anchor | 内部原文坐标，含 scope、quote、normalized quote/hash、start/end offset；不作为 UI 术语 |
| Artifact | 关联原文的 AI output 或用户 note |
| Task | 一次 streaming action 的运行状态和 request identity |
| Close Reading | 整篇文本的连续 Markdown 深度讲解 |
| History | 当前 session 内已保存工作的显式查询入口 |
| Legacy analysis | 旧的一次性分析记录，经兼容入口导入，不等同于当前 session |
| Skill | 在 Anchor 上触发的 AI 动作：Explain、Translate、Vocab；每次运行生成一个 Artifact |
| Note | 用户写在 Anchor 上的 Artifact；AI 不覆盖 |
| Local workspace | 当前设备上该用户的全部 reading sessions 与阅读偏好，按用户隔离保存在 localStorage；界面只读这一份状态 |
| Cloud workspace | D1 中该用户的 reading sessions 与 workspace preferences |
| Revision | 云端 reading session 的版本号；保存和删除带 `If-Match`，不一致返回 409 |
| Baseline | 上次确认同步时 reading session 各部分的内容哈希，三方合并据此判断哪一侧改动 |
| Sync journal | 本地记录的已同步、待保存、待删除 sessions 及其 revision / baseline，重载后继续同步 |
| Sync conflict | 两侧改了同一部分，或一侧删除一侧修改；该 session 暂停同步，由用户在原阅读中选择 |

Offset 使用 JavaScript 字符串坐标（UTF-16 code units）。恢复先核对原位置，
再尝试唯一 quote 匹配；歧义不静默绑定到首个位置。

## 架构与请求归属

```text
Browser: React + Vite + TypeScript
  认证页与 /app/* → same-origin /api/*
Cloudflare Worker: Hono
  ├─ Worker Assets → React SPA
  ├─ Better Auth → D1 identity
  ├─ account / workspace / reading-sessions → D1
  └─ allowlisted AI routes → FastAPI on Fly.io → Gemini
```

请求集中于 `frontend/client-api/`；页面 hook 编排流程，`features/` 保存领域逻辑，
展示组件接收 typed props。
本地状态变更集中于 `features/reading/reading-workspace.ts`；云同步协议在 `features/reading/reading-sync.ts`，
HTTP 与 sync journal 存储作为注入的 adapter。开发时 Vite 代理到本地 Worker。
决策见 [ADR 0001](adr/0001-cloud-auth-and-reading-sessions.md)，
运行与部署见 [Cloudflare Operations](../cloudflare/README.md)。

## AI API 与契约

| 路径 | 用途 |
| --- | --- |
| `POST /api/anchors/run` | Explain / Translate / Vocab |
| `POST /api/anchors/explain` | Explain-only 兼容入口 |
| `POST /api/analyze/stream` | 整篇 Close Reading 和 legacy 流式分析 |
| `POST /api/analyze` | 同步兼容入口 |

Anchor 请求见 [Pydantic schema](../backend/schemas/anchors.py)：document、anchor、skill、
user_language、model。Scope 为 document / paragraph / selection；产品入口范围不等同于
schema 允许的全部范围。主模型可选 `gemini-2.5-flash`（默认）、`gemini-2.5-pro`
或 `gemini-4-argon`（Gemini 4 Argon，无免费额度）。

Gemini 4 使用普通 `generateContent` 同步/流式请求，保留默认 thinking level，
不发送 sampling 参数覆盖，输出预算为 32,768 tokens（含 thinking），请求超时为
20 分钟；不启用 long decode。模型 ID 和迁移要求见 Google 官方
[Gemini 4 指南](https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_started_Generate_Content.ipynb#gemini4)。
部署前先应用 `0004_gemini_4_model.sql`，扩展 D1 模型约束并保留已有加密凭据。

Anchor SSE 带 request_id、trace_id、anchor_id，chunk.delta 是增量。
**要求**：identity 一致、只有匹配 done 能完成、error 后不再完成。
[anchor-api](../frontend/client-api/anchor-api.ts) 要求非空 done.result、请求中的 anchor ID，
以及流内一致的 request/trace ID；提前 EOF、身份不一致或 error 均失败。
两个客户端共用 SSE 读取与解码；[analysis-api](../frontend/client-api/analysis-api.ts)
同样检查缺失 done，但 legacy SSE 不带上述 identity。

`TextAnalysisLangchain` 共享 detect → correct? → interpret：Flash Lite 检测及纠错，
配置的主模型生成讲解。Explain、Translate、Vocab 仍拼入技能指令和全文，
复用通用 workflow；独立 prompt/context policy 尚无质量基线。

## 数据与隐私边界

- Worker 按用户解密 key，向 FastAPI 添加 `X-Gemini-Key`；FastAPI 不持久化 key。
- 生产 FastAPI 必须配置 `LOGOSAI_GATEWAY_SECRET`，校验 `X-LogosAI-Gateway`；当前代码在未配置时跳过校验，不会自动区分生产与本地。
- D1 保存用户隔离的数据；key 用 AES-GCM、随机 IV、user ID associated data 加密；读取仅返回存在标志和末四位 hint。
- Source 与 note 依赖平台存储加密，不是 E2E encryption；OAuth token 使用 Better Auth token encryption。
- LocalStorage 为用户隔离缓存；旧数据首次认领保持兼容，不可跨账号继承。
- 本地 journal 保存未同步修改及删除意图；服务端删除 session 级联 anchors 与 artifacts。保存/删除均校验 revision；独立修改按内容基准合并，重叠修改保留本地待复核版本，不自动复制阅读；无服务端删除 tombstone。
- 默认不向监控服务上报完整原文、prompt、note、key 或身份。AI 请求仍会发送原文给模型；LLM 监控内容仅在显式开启 `SENTRY_CAPTURE_LLM_CONTENT` 后按长度上限采集。
- Worker 只把上表 4 条 AI 路径转发给 FastAPI，转发前去除 cookie、浏览器 authorization 头与 origin。
- 持久化为 `running` 的 artifact 读回时视为 `stopped`；重载不声称已中断的流仍在运行。
- Source 为不可信数据；当前无 tool execution，仍需检查 prompt injection 对 grounding 的影响。

## 云写入版本前提

`PUT /api/reading-sessions/:id` 与 `DELETE /api/reading-sessions/:id` 要求
`If-Match: "<revision>"`；新 session 使用 `"0"`，JSON snapshot 结构不变。
缺少版本返回 428，旧版本返回 409；migration `0003_reading_revision_guards.sql` 的
D1 触发器使过期整包替换原子失败。构建云快照时校验 active anchor 属于当前阅读。
冲突后的交互与恢复规则见[旅程契约](ux/workspace-journey-contract.md#云写入冲突恢复)。

## 验证边界

Contract tests、真实服务端到端检查、模型评估与用户观察不能互相替代。
命令统一见 [AGENTS.md](../AGENTS.md#verification)，每次执行结果写入 PR；原始记录留本地。
已知阻塞与验收待办由[路线图](roadmap.md)维护，历史报告不证明当前部署通过。

历史验收的原始记录在 Git 历史：[2026-09-13](https://github.com/IvanMiao/LogosAI/blob/3b37a346817fcafabaf1828c5f66df00568859cc/docs/ux/real-service-acceptance-2026-09-13.md)、
[2026-09-15](https://github.com/IvanMiao/LogosAI/blob/3b37a346817fcafabaf1828c5f66df00568859cc/docs/ux/real-service-acceptance-2026-09-15.md)；结论限于当次环境，不证明后续提交或部署通过。

## 阅读现场与地址

`/app/readings/:documentId` 定位阅读对象；`?artifact=:artifactId` 打开已保存成果，
`?view=history` 打开该 session 的 History；`/app/new` 为导入入口。
`/app` 恢复当前用户最近打开的 session；`/app/analysis` 保留 legacy 入口。
地址只提供定位，不授予其他账号访问权限。

阅读现场由版本化、按用户与 document 隔离的本地快照保存，不进入云 API。
恢复、加载和失败回退规则见[旅程契约](ux/workspace-journey-contract.md#阅读现场与导航e1)。
