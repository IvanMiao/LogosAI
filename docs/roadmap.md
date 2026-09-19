# LogosAI Roadmap

- 状态：Active，产品研究与工程交付的唯一实施顺序
- 更新：2026-09-19，同步主线已完成的 N1/N2 工程验收；当前重点为 N3 与 R1
- 现状：[项目参考](project.md)；来源：[用户证据](user-evidence.md)

跨切片边界与待决项见[工作台演进设计](ux/reading-workspace-evolution.md)，
当前行为见[旅程契约](ux/workspace-journey-contract.md)。

## 当前目标与状态

可靠完成“导入 → 阅读 → 选段求助 → 继续阅读 → 保存后返回”，并弄清用户为什么回来。
工程可靠性与用户研究并行，不等待基础设施扩展才接触用户。

分别记录 **代码已实现 / 端到端已验证 / 用户价值已验证**。
Now 是当前优先事项；Next 按启动条件推进；Later 等待证据。

## 已实现，退出待建清单

| 能力 | 代码与测试证据 | 剩余验证 |
| --- | --- | --- |
| 精确选区与 note 基础 | DOM Range、重复 quote、歧义、跨段及 Unicode 测试 | 真实浏览器选区、note 刷新定位；前后文 selector 未独立实现 |
| Cloud foundation | Better Auth、D1 sessions、per-user key、journal 和重试 | 真实注册恢复、断网与多标签页验收已通过；持续观察 |
| 阅读工作台 | 默认双栏、独立 History、整篇 Close Reading、段落 Explain | 真实服务与用户 Firefox 200% 验收已通过 |
| 阅读现场与导航 E1 | session / artifact 地址；用户隔离现场；History 返回；[导航回归](../frontend/tests/workspace/reading-navigation.test.tsx) | 真实恢复、多标签页与 200% 缩放已验证；用户价值仍待观察 |
| Anchor 流终态校验 | 匹配 done、identity 校验；截断保留部分输出、failed 与 Retry；transport 和旅程回归测试 | 真实服务 stop/retry、受控断流与云同步验收已通过 |
| 重载恢复 | Persisted running → stopped，可重试 | 断流与云同步组合验收已通过 |
| LLM monitoring | Spans、首 token 延迟、usage 采集代码 | 生产采集完整性与健康状态 |

Cloud auth 是 2026-08-09 明确产品决策，不作为重复使用需求已经验证的证据。

### 已完成的工程验收

- **N1：Explain 流终态可靠性**。真实完成/error/retry/stop、任务归属与云保存，以及回放截断/identity/error 已验证。
- **N2：云端数据恢复**。#49/#50 与 migration 0003 已部署；并发保存/删除、立即刷新、离线加并发恢复和重新登录通过，原数据丢失阻塞已解除。

环境、版本与证据来源统一见[项目参考](project.md#已记录的生产验收)。上述是工程验收，
不代表模型质量或用户价值已验证。后续数据/流改动仍需保留对应回归与真实服务检查。

## Now

### N3：解释质量基线

- 问题：eval 只校验 JSONL 结构，没有真实模型质量基线。
- 范围：复用数据集，补真实任务；保存模型、prompt 版本、上下文策略、输出及耗时，记录人工评分和失败原因。
- 评价：grounding、选段聚焦、目标语言、帮助程度、上下文不足、过度推断、prompt injection。
- 验收：至少一组可重复运行的真实输出经人工 review；结构校验 PASS 与质量结论分开呈现。
- 基础：N1 已通过；端到端质量判断沿用可靠终态路径。

### R1：解释回访原因（与工程并行）

- 来源：2026-08-08 创始人记录称 5 人使用、3 人回访；原因、时间窗与独立证据仍缺失。
- 任务：先了解 3 位回访用户的具体阅读任务、回来时间、替代工具与不可替代环节，再观察至少 5 位非朋友候选读者。
- 方法：用真实文本还原原流程；记录 import/BYOK 阻碍、首次有效解释耗时、得到帮助后能否继续阅读。
- 验收：至少 3 条非朋友用户独立痛点证据，指出最强的“读者 + 文本 + 场景”；同时记录反对证据。
- 可选比较：同文本同任务匿名输出对比，保留模型/设置及理由；不泛化为优于通用产品。

## Next

| 任务 | 启动条件 | 交付与验收 |
| --- | --- | --- |
| Explain 专用 prompt/runner 与上下文策略 | N1 已通过；N3 建立质量基线，R1 提供任务 | 比较 quote / paragraph / neighborhood / 全文；选择足够上下文；记录 provenance；质量不退化，耗时和输入规模可比较 |
| 首次使用改进 | R1 找到阻断点 | 解决导入、key 或首次回答的具体问题，以任务完成与有效帮助验收 |
| 默认阅读布局原型（E0） | E1 已实现；结合 R1 观察 | 比较原文优先与默认双栏；在用户验证前保持当前默认布局 |
| 连续讨论与成果组织（E2–E5） | E1、N1/N2 工程验证已通过；仍需 N3 支持追问质量评估 | 按实施设计依赖推进选区讨论、History、引用预览与辅助区；默认布局通过原型验证 |
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
- 用户级 agent 与记忆（E6）、服务端持久任务（E7）按实施设计保留边界，分别等待讨论价值与 Durable Jobs 等相关证据；不因文档存在直接启动平台重构。
- 短 Translation/Vocab 展示方式、默认阅读布局和 Close Reading 修订呈现仍需原型验证，不把目标设计当作现状。
- 首页表述等待用户原话与定位；定价等待持续使用/付费证据；扩大流量等待核心路径稳定。
- 不混合框架替换、依赖扩张和功能开发。重大数据/API 决策在切片启动时写 ADR。

## 完成标准

每项在 PR 中记录代码证据、验证环境/版本/日期、结果、失败路径与未验证项；原始日志留本地。
AI 改动需相称的真实模型 review；持久交互规则变化时更新旅程契约对应条目，并执行
[相关检查](../README.md#verify-changes)。私人原文与笔记不进入公开证据或默认 telemetry。
