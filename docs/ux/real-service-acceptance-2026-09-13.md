# 真实服务验收：阅读可靠性

- 日期：2026-09-13（Europe/Paris）。
- 关联：GitHub #43、#44、#45、#46。
- 生产环境：`https://logosai.ymiao.dev`，真实 Better Auth、Cloudflare D1、Fly.io / Gemini 链路；独立测试账号与合成阅读材料。未部署本轮改动，生产资源未映射到可核实的 commit hash。
- 代码基线：GitHub main `f7cc567`。本地浏览器还包含验收开始前已有的导航改动；本轮并发修复单独提交，不把这些改动算作生产交付。
- 故障环境：本地 Vite + 临时 HTTP 代理，认证和持久化请求连接上述测试账号；SSE 故障使用一次真实响应的回放，明确不等同于自然发生的生产故障。

## Explain（#44）

| 场景 | 结果 |
| --- | --- |
| 无 key 导入 / 打开段落 | 阅读和导入可用；提示前往 Settings；不生成 AI 成果 |
| 无效 key 的真实请求 | Gemini 返回 `API_KEY_INVALID`；界面为 failed，有 Retry 和 trace；没有误标 complete |
| 更新 key 后 Retry | 真实 Gemini 正常完成，结果保存到生产 D1 |
| 运行时切换段落 | 两个真实请求分别完成；云端输出分别对应第 1、2 段，长度为 5943、5766 字符 |
| 主动 Stop | 真实请求取消后为 stopped，提供 Retry；本次在正文到达前停止 |
| 真实协议采样 | HTTP 200，14.4 秒；2 个 stage、24 个 chunk、1 个 done；全流只有一组 request / trace / anchor identity，done.result 为 6010 字符 |
| 缺 done 的回放 | 保留已收到的正文，failed，显示提前结束错误并可 Retry |
| 回放中 trace identity 改变 | failed，显示 identity changed，不能 complete |
| 正文后的 error 回放 | failed，保留正文、错误提示和 Retry |
| 故障后恢复有效回放 | Retry 最终 complete；不沿用失败终态 |

终态代码、真实服务 happy path 与错误路径、受控异常协议和云保存均取得证据。
回放结果沿用合成原文，只用于传输可靠性，不作为解释质量证据。

## 云保存与恢复（#45）

| 场景 | 结果 |
| --- | --- |
| 注册 → 登录 → 导入 | 浏览器完成；独立 API 读取确认真实 D1 存在对应 session |
| Note 编辑后立即刷新 | 在 1500ms 同步 debounce 前调用刷新；笔记恢复且最终进入 D1 |
| 断开持久化请求后编辑 | 显示 cloud sync failed 和 Retry；刷新后本地笔记仍在 |
| 恢复连接并 Retry | 真实 D1 读回完整 `ACCEPTANCE-OFFLINE` 笔记 |
| 登出 → 再登录 | 回到原阅读；History 中可打开恢复后的 Note |
| 删除测试阅读 B → 重开原地址 | DELETE 返回 204；D1 中不存在；浏览器显示 unavailable、Open reading sessions、Retry cloud sync |
| 两标签页编辑不同字段 | **失败：静默覆盖已经保存的笔记**，详见下文 |

### 已确认的并发覆盖

1. A、B 两标签页加载同一 session。
2. A 把笔记改为 `ACCEPTANCE-NOTE-A-V2`，等待 Saved to cloud；独立 API 确认新版已保存。
3. B 保留旧快照，仅重命名 session，然后显示 Saved to cloud。
4. 独立 API 读回 B 的新标题，但笔记已经回到旧 `ACCEPTANCE-NOTE-A`。

原因：服务端无客户端版本前提地整包替换 session / anchors / artifacts。
revision 虽递增，却没有保护旧客户端写入。数据丢失阻止 #45、#43 完成。

### 本轮修复（尚未部署）

- 保存与删除要求 `If-Match: "revision"`；新 session 使用 `"0"`。缺少前提返回 428，旧版本冲突返回 409。
- D1 触发器保证 revision 原子递增。两个请求即使同时读到旧 revision，也只有一个整包事务可提交；另一批次整体回滚。
- 前端记录基准 revision；冲突重试保留云端新版，把本地版本复制到新 session，标题带 `(conflict copy)`，并重新生成成果与 anchor ID。
- 旧删除请求不能删除更新后的阅读；冲突重试恢复该云端阅读。远端已删除的本地改动保存为新副本，不复活原 ID。
- 没有本地未同步改动时以云端为准，不再凭客户端时间戳覆盖云端内容。

发布要求：先应用 `0003_reading_revision_guards.sql`，再同时发布 Worker 和前端；现有旧页面收到 428 后需刷新。发布后必须重跑真实多标签页与离线组合验收，不能凭本地测试关闭 #45。

## 阅读导航（#46）

- 生产桌面原文滚动到 1800px 后，刷新、从 Settings 浏览器后退、经新建 B 再后退回 A，均恢复到 1800px。
- History 搜索 `ACCEPTANCE-NOTE-A`、Source order 排序 → Open in Text → 浏览器后退，搜索和排序保留。
- 成果地址包含明确 artifact ID；重新打开可恢复 Note，已保存内容无需重新调用 AI。
- 390 × 844 生产浏览器中，原文和工具栏无页面横向溢出，阅读位置仍落在相同段落附近。
- 删除阅读后的地址显示可恢复的 unavailable 状态。
- **200% 浏览器缩放未验证**：内嵌浏览器的缩放快捷键没有改变实际倍率（DPR≈1，visualViewport.scale=1）；不把 390px 或 640px viewport 当成 200% 缩放。
- 多标签页受上述云覆盖问题影响。#46 暂保留开放。

## 检查与结论

- 独立 PR 分支：前端 lint、TypeScript、148 个测试和 build 通过，不包含原有未提交导航改动。
- 原工作区同样通过前端检查，153 个测试；多出的 5 个测试属于原有导航改动。
- Worker：`npm run check` 通过，23 个测试；其中真实本地 D1 验证旧版本、同时写入及删除保护。并发测试强制两个请求先读到同一版本，再启动事务。
- 新增前端旅程回归验证冲突 → Retry → 云端新版与本地冲突副本同时保留。
- 两个浏览器标签页连接隔离本地 Worker / D1 复测通过：新版 `LOCAL NEWER NOTE` 保存在原阅读 revision 4；旧标签页重命名返回冲突，Retry 后独立冲突副本 revision 1 保存旧 `LOCAL ORIGINAL NOTE`，两份内容均从 D1 独立读回。
- #44 可按上述边界完成；#45 和 #43 仍被生产并发覆盖阻塞；#46 待并发修复发布复验与实际 200% 缩放。
- 本轮不声称完成自然用户价值、屏幕阅读器或解释质量评估。

验收结束后已移除生产测试账号的 Gemini key，API 返回 `hasApiKey: false`。
