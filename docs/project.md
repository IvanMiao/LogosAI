# LogosAI Project Reference

- 状态：Active，当前产品与工程参考
- 核对日期：2026-09-05（代码与测试静态核对，不代表生产验收）
- 下一步：[路线图](roadmap.md)；用户与价值假设：[用户证据](user-evidence.md)

## 产品边界

LogosAI 帮助读者在原文上下文中理解困难片段，并保存可回到原文的解释和笔记。
文本是核心对象；AI 输出关联原文；AI 不覆盖用户笔记。当前版本以用户主动触发帮助为主，
personal memory、主动推荐与自动 agent 工作流暂不纳入本阶段实现，属于后续演进方向。
具体范围与启动时机根据需求和验证结果确定，见[路线图](roadmap.md)。

## 当前能力与限制

| 能力 | 已实现 | 尚未验证或已知限制 |
| --- | --- | --- |
| 文本入口 | Paste、`.txt`、`.md`、legacy history 导入；多个 reading sessions | 每个 session 对应一份原文；首发人群和最佳导入方式待验证 |
| Reader | 桌面默认双栏；source / split / analysis 布局与 History 分离；阅读偏好可调 | 移动端、缩放、滚动与返回路径需真实浏览器验收 |
| Selection | Explain、Translate、Vocab、Note；确认动作后保存选区 | DOM Range 提供真实 offset；旧 anchor 无法唯一恢复时不猜测；前后文 selector 尚未独立建模 |
| Close Reading | 工作区提供整篇精读；段落动作归为 Explain | 仍使用 legacy analysis stream；旧接口与 history 导入保留兼容 |
| Artifact | 解释、翻译、词汇、精读和笔记随 session 同步 | model、prompt version、context policy 尚未作为完整 provenance 保存 |
| Streaming | Stage/chunk/done/error、stop/retry；重载后 running 恢复为 stopped | Anchor 客户端缺少必须收到 done 与严格 identity 校验；本地 request ID 尚未作为 client_request_id 贯穿协议 |
| 数据恢复 | D1、用户隔离的 localStorage、同步 journal、删除 tombstone、失败重试 | Aggregate replacement、last-writer-wins；无冲突 UI；真实多设备恢复待验收 |
| 登录与 key | Better Auth email/password；OAuth 按凭据启用；Worker 加密保存用户 Gemini key | 本轮未核实生产 OAuth 配置；尚无邮件验证/密码重置邮件服务 |
| 监控 | 前端、Worker、FastAPI Sentry；后端 LLM spans、耗时、首 token 延迟及 usage 记录 | 采样、模型 usage 完整性与 sink health 不由代码存在保证 |
| 评估 | Workspace Alpha JSONL 与结构校验程序 | 不运行真实模型，不证明生成质量 |

精确选区已有[实现](../frontend/features/anchors/selection-offsets.ts)、
[重复文本/歧义测试](../frontend/tests/anchors/anchor-core.test.ts)及
[跨段/Unicode 测试](../frontend/tests/anchors/selection-offsets.test.ts)。
交互以[旅程契约](ux/workspace-journey-contract.md)为准，不再使用旧三模式设计。

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

Offset 使用 JavaScript 字符串坐标（UTF-16 code units）。恢复先核对原位置，
再尝试唯一 quote 匹配；歧义不静默绑定到首个位置。

## 架构与请求归属

```text
Browser: React + Vite + TypeScript
  /login, /register, /app, /app/settings → same-origin /api/*
Cloudflare Worker: Hono
  ├─ Worker Assets → React SPA
  ├─ Better Auth → D1 identity
  ├─ account / workspace / reading-sessions → D1
  └─ allowlisted AI routes → FastAPI on Fly.io → Gemini
```

请求集中于 `frontend/client-api/`；页面 hook 编排流程，`features/` 保存领域逻辑，
展示组件接收 typed props。开发时 Vite 代理到本地 Worker。
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
schema 允许的全部范围。主模型为 `gemini-2.5-flash` 或 `gemini-2.5-pro`。

Anchor SSE 带 request_id、trace_id、anchor_id，chunk.delta 是增量。
**要求**：identity 一致、只有匹配 done 能完成、error 后不再完成。
**缺口**：[anchor-api](../frontend/client-api/anchor-api.ts) 在 EOF 时仅要求 metadata；
[analysis-api](../frontend/client-api/analysis-api.ts) 已检查缺失 done，但 legacy SSE 不带上述 identity。

`TextAnalysisLangchain` 共享 detect → correct? → interpret：Flash Lite 检测及纠错，
配置的 Flash/Pro 生成讲解。Explain、Translate、Vocab 仍拼入技能指令和全文，
复用通用 workflow；独立 prompt/context policy 尚无质量基线。

## 数据与隐私边界

- Worker 按用户解密 key，向 FastAPI 添加 `X-Gemini-Key`；FastAPI 不持久化 key。
- 生产 FastAPI 应配置 `LOGOSAI_GATEWAY_SECRET`，校验 `X-LogosAI-Gateway`。
- D1 保存用户隔离的数据；key 用 AES-GCM、随机 IV、user ID associated data 加密；读取仅返回存在标志和末四位 hint。
- Source 与 note 依赖平台存储加密，不是 E2E encryption；OAuth token 使用 Better Auth token encryption。
- LocalStorage 为用户隔离缓存；旧数据首次认领保持兼容，不可跨账号继承。
- Journal 保存未同步修改及删除意图；删除 session 级联 anchors 与 artifacts。
- 默认不上传完整原文、prompt、note、key 或身份。LLM 内容仅在显式开启 `SENTRY_CAPTURE_LLM_CONTENT` 后按长度上限采集。
- Source 为不可信数据；当前无 tool execution，仍需检查 prompt injection 对 grounding 的影响。

## 验证边界

Contract tests、真实服务端到端检查、模型评估与用户观察分别记录，不能互相替代。
命令统一见 [README](../README.md#verify-changes)。历史报告不证明当前部署通过，
历史材料仅保存在本地 `docs/archive/`，不随仓库分发。
