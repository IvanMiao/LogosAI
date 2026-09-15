# 2026-09-15 生产发布与验收

## 发布

- 服务：https://logosai.ymiao.dev；仅使用独立合成验收账号和测试阅读。
- PR #49 已合并；D1 migration `0003_reading_revision_guards.sql` 已应用，无待执行迁移。
- 发布后发现新建阅读可能携带前一篇阅读的 active anchor，生产返回 422，Retry 无法保存。PR #50 复用 document ownership 校验修复；回归测试先失败后通过。
- 最终生产提交：`c8eb696`（PR #50 合并）；Worker 版本：`bdbd0041-26a0-4229-bf9b-62ef3e861962`。前端入口为 `index-B2l5ywOT.js`。
- 前端 lint、TypeScript、154 项测试和 build 通过；Worker typecheck 与 23 项测试通过。PR #50 的 frontend、backend、cloudflare 和安全 CI 全部通过。FastAPI 未改动。

## #45 云保存与恢复：通过

| 场景 | 生产证据与结果 |
| --- | --- |
| 新建阅读恢复 | 原先返回 422 的阅读在 PR #50 发布后刷新，自动保存为 revision 1；原文未丢失 |
| Note 后立即刷新 | V1 笔记保留，独立 GET workspace 确认云端 revision 3 |
| 缺版本与并发写入 | 缺 If-Match 返回 428；三个相同 revision 的并发写入返回 409/200/409，revision 只增长一次 |
| 两标签页修改 | A 保存 V2，API 确认 revision 4；仍持有 V1 的 B 仅重命名，保存显示失败；Retry 后原阅读保留 V2，B 标题及 V1 保存为独立 conflict copy（revision 1） |
| 冲突副本可用 | 阅读列表能找到副本；打开其选段，Note 内容仍为 V1 |
| 并发删除 | 先从另一客户端保存 V3，再从旧标签删除；云端 revision 3 与 V3 保留；界面 Retry 恢复 V3 |
| 删除后立即刷新 | 使用当前 revision 删除合成副本，立刻刷新；云端记录消失，原地址显示 unavailable，提供 Sessions 和 Retry |
| 离线编辑、刷新、重试 | 阻断云请求时编辑 OFFLINE V4 并立即刷新，本地内容保留；云端仍是 V2。恢复连接并 Retry 后，云端 revision 5 包含 V4 |
| 离线加并发更新 | 离线编辑 V5 并刷新，同时另一客户端将云端更新为 V6；重连 Retry 后原阅读 revision 6 保留 V6，独立副本 revision 1 保留 V5 |
| 登出再登录 | 从生产界面登出并重新登录，原阅读及 V6 Note 恢复，History 中可打开成果 |

离线测试通过仅绑定 `127.0.0.1` 的故障代理运行同一份生产构建，使用独立验收账号转发到真实生产 API/D1，并保留 If-Match。故障只切断 workspace/reading 请求，不模拟云数据库；结果由独立生产 API 读取核对。直接域名双标签页测试独立于故障代理。

关键测试阅读：`document-627e94d4-0feb-44af-9dcd-11764c4b3dcd`；最终离线冲突副本：`document-a9c26186-1d85-4f44-97a5-1a42a282a6b3`。用于删除验证的副本已删除。

## #46 导航与缩放：通过

- 本轮生产复验：History 搜索 `REMOTE`、Source order → Open in Text → 浏览器后退，搜索与排序仍保留；成果地址能打开对应 Note。
- 多标签页、云恢复、不可用地址的导航与 Retry 已按上表复验。
- 用户在自己的 Firefox 中完成实际 **200% 浏览器缩放**验收，并明确报告通过。此项为用户实测，不以窄 viewport 代替。
- 上轮 A→B→A、1800px 滚动恢复、Settings 返回、刷新、390px 窄屏的证据沿用 [2026-09-13 记录](real-service-acceptance-2026-09-13.md)。当时已有的导航修补 `acc1fc7`、`f4ada22` 已包含在本次部署中。

## #43 阅读闭环：工程验收通过

#44 的真实 Gemini 终态与受控故障验证于 2026-09-13 通过；本轮未改动 AI 后端或重跑模型请求。#45 的数据丢失阻塞已修复并完成生产复验，#46 的缩放缺口已由用户实测补齐。此次结论是已列场景的工程验收通过，不代表模型质量基线、用户价值或自然回访研究已经完成。

本轮未新增或读取 Gemini key；使用的账号保持无 key 状态。生产日志仅用于定位验收请求的 422；诊断完成后停止采集，临时认证与日志文件不提交仓库。
