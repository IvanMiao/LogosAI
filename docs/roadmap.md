# LogosAI Roadmap

- 状态：Active，产品研究与工程交付的唯一实施顺序
- 更新：2026-09-05，依据文档审阅校准；本次没有实施产品代码
- 现状：[项目参考](project.md)；来源：[用户证据](user-evidence.md)

## 当前目标与状态

可靠完成“导入 → 阅读 → 选段求助 → 继续阅读 → 保存后返回”，并弄清用户为什么回来。
工程可靠性与用户研究并行，不等待基础设施扩展才接触用户。

分别记录 **代码已实现 / 端到端已验证 / 用户价值已验证**。
Now 是当前优先事项；Next 按启动条件推进；Later 等待证据。路线图不代表本轮已执行。

## 已实现，退出待建清单

| 能力 | 代码与测试证据 | 剩余验证 |
| --- | --- | --- |
| 精确选区与 note 基础 | DOM Range、重复 quote、歧义、跨段及 Unicode 测试 | 真实浏览器选区、note 刷新定位；前后文 selector 未独立实现 |
| Cloud foundation | Better Auth、D1 sessions、per-user key、journal 和重试 | 真实注册到恢复链路、断网及多标签页覆盖行为 |
| 阅读工作台 | 默认双栏、独立 History、整篇 Close Reading、段落 Explain | 响应式、缩放、滚动与返回状态 |
| 重载恢复 | Persisted running → stopped，可重试 | 与真实断流、云同步组合检查 |
| LLM monitoring | Spans、首 token 延迟、usage 采集代码 | 生产采集完整性与健康状态 |

旧 Delivery 1 的核心定位能力已实现，不将其全部设计要求或用户验收自动标为完成。
Cloud auth 是 2026-08-09 明确产品决策，不作为重复使用需求已经验证的证据。

## Now

### N1：Explain 流终态可靠性（工程第一项）

- 问题：Anchor 客户端收到 metadata 后 EOF 可正常返回；上层可能标为 complete，并用空结果覆盖部分输出。来自静态审阅，尚未运行复现。
- 范围：必须收到匹配 done；校验 identity；截断保留 partial output 并允许重试；协议扩展保持旧调用兼容。
- 验收：正常 done 完成；缺 done、错 identity、error、主动 stop 有明确终态；切换选区不改变原 task 归属。
- 验证：transport 回归测试、相关前后端检查及真实 stream。沿用 stopped/failed；若增加 interrupted，先明确数据兼容方案。

### N2：云端数据恢复验收

- 问题：已有持久化和 mock 测试，缺少当前完整真实服务验收记录。
- 范围：注册/登录、导入、note、刷新、登出再登录；断网编辑后恢复；debounce 前刷新；删除后刷新；多标签页修改。
- 验收：内容可恢复；本地保存与云同步状态准确；失败可见且可重试；记录并发覆盖行为。
- 约束：复用 journal 与重试；复现覆盖后再决定 revision 检查/冲突副本，不先引入协作框架。数据丢失问题优先修复。

### N3：解释质量基线

- 问题：eval 只校验 JSONL 结构，没有真实模型质量基线。
- 范围：复用数据集，补真实任务；保存模型、prompt 版本、上下文策略、输出及耗时，记录人工评分和失败原因。
- 评价：grounding、选段聚焦、目标语言、帮助程度、上下文不足、过度推断、prompt injection。
- 验收：至少一组可重复运行的真实输出经人工 review；结构校验 PASS 与质量结论分开呈现。
- 顺序：可与 N1 并行准备样本；端到端质量判断使用可靠终态路径。

### R1：解释回访原因（与工程并行）

- 来源：2026-08-08 创始人记录称 5 人使用、3 人回访；原因、时间窗与独立证据仍缺失。
- 任务：先了解 3 位回访用户的具体阅读任务、回来时间、替代工具与不可替代环节，再观察至少 5 位非朋友候选读者。
- 方法：用真实文本还原原流程；记录 import/BYOK 阻碍、首次有效解释耗时、得到帮助后能否继续阅读。
- 验收：至少 3 条非朋友用户独立痛点证据，指出最强的“读者 + 文本 + 场景”；同时记录反对证据。
- 可选比较：同文本同任务匿名输出对比，保留模型/设置及理由；不泛化为优于通用产品。

## Next

| 任务 | 启动条件 | 交付与验收 |
| --- | --- | --- |
| Explain 专用 prompt/runner 与上下文策略 | N1、N3 建立基线，R1 提供任务 | 比较 quote / paragraph / neighborhood / 全文；选择足够上下文；记录 provenance；质量不退化，耗时和输入规模可比较 |
| 首次使用改进 | R1 找到阻断点 | 解决导入、key 或首次回答的具体问题，以任务完成与有效帮助验收 |
| UI 连续阅读修复 | QA 复现返回、选区、焦点或窄屏问题 | 小切片修复并更新旅程契约，不重建双栏 |
| Narrow beta | Core Value 满足 | 观察 1–2 周自然回访、第二篇文档和成果重开 |

## 扩展条件

| Gate | 所需证据 | 可以讨论 |
| --- | --- | --- |
| Core Value | 首发场景至少 3 个独立证据；旅程无 critical issue；Explain 可靠且经人工质量 review；import/BYOK 不阻断用户 | Narrow beta、收窄用户与价值表述 |
| Repeat Use | 1–2 周自然第二次 session/第二篇文档/成果重开及其原因 | 按真实容量与离线需求扩展 storage、revision、导出；现有恢复/删除问题不等待此 gate |
| Learning Loop | 一种跨 session 行为比一次性解释增加价值 | Review、summary、provenance inspector、Translate/Vocab 投入排序 |
| Proactive Assistance | 人工 preview 的接受、忽略、错误、帮助与成本证据 | PreRead、干预频率与可检查/删除 memory |
| Durable Jobs | 明确需要离开页面后持续执行 | Queue、后台重试/取消或新 orchestration |

## Later / 暂缓

- PDF、EPUB、网页导入：先确认哪一种阻断真实任务，允许低成本原型。
- RAG、向量库、知识图谱、自动推荐、planner、agent kernel、协作、public feed：等待需求证据。
- UI reducer、完整 AnalysisRoute、per-session scroll snapshot、session URL、History 分组：旧提案未整体获准实施，仅按具体问题或需求拆分。
- 短 Translation/Vocab 展示方式、Close Reading revisions 分组仍是产品选择，不把归档提案当作现状。
- 首页表述等待用户原话与定位；定价等待持续使用/付费证据；扩大流量等待核心路径稳定。
- 不混合框架替换、依赖扩张和功能开发。重大数据/API 决策在切片启动时写 ADR。

## 完成标准

每项记录代码证据、验证环境/日期、结果、失败路径与未验证项。
AI 改动需相称的真实模型 review；行为变化同步旅程契约并执行
[相关检查](../README.md#verify-changes)。私人原文与笔记不进入公开证据或默认 telemetry。
历史方案仅保存在本地 `docs/archive/`，不随仓库分发，不另维护第二套执行顺序。
