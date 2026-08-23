# Workspace UI/UX 验证记录（2026-08-23）

- 分支：`codex/uiux-information-architecture`
- 实现基线：`3399786 feat: restructure the reading workspace`
- 设计基线：[workspace-information-architecture.md](./workspace-information-architecture.md)
- 旅程契约：[workspace-journey-contract.md](./workspace-journey-contract.md)

## 结论

新 Workspace 的信息架构、关键状态和响应式布局已经达到进入人工试用的条件：

- Sessions navigation 与 session 内工作分离；
- `Text` / `Close Reading` / `History` 成为三个稳定模式；
- Explain 作为锚定原文、自动保存的当前工作详情；
- Close Reading 保持整篇技能语义，并允许从原文区继续 Explain；
- History 明确承担查询职责，支持时间顺序与原文顺序；
- Reading appearance 默认统一作用于原文和分析，并允许解除联动。

真实账号的浏览器提交没有被误报为成功：应用内浏览器的安全审批拒绝访问本地 Worker 端口，随后本地 HTTP 注册请求也在执行前被环境审批拦截。因此本轮没有创建测试账号，认证提交级验证仍需一次人工 smoke test。

## 已验证范围

### 浏览器视觉与可访问结构

在构建后的本地前端完成以下检查：

| 场景 | 桌面（约 1280px） | 移动（390px） | 结果 |
| --- | --- | --- | --- |
| 注册页布局 | 表单居中，信息层级清楚 | 单列、无横向溢出 | 通过 |
| 注册字段 | Name / Email / Password 均有可访问标签 | 标签与点击区域保持可用 | 通过 |
| 主操作 | `Create account` 语义明确 | 保持可见且未被遮挡 | 通过 |
| 控制台 | 未观察到页面运行错误 | 未观察到页面运行错误 | 通过 |

移动端长截图出现过一次底部内容重复的捕获现象；DOM 仅存在一份表单，判定为截图拼接现象，不是页面重复渲染。

### 可执行 Workspace 旅程

`frontend/tests/workspace/workspaceJourney.test.tsx` 固定了 11 条旅程：

1. 三种稳定模式；
2. 段落 Explain 自动保存；
3. 整篇 Close Reading；
4. Close Reading 内直接 Explain；
5. History 查询与两种排序；
6. 从 History 恢复精确原文 range；
7. Reading appearance 默认统一与解除联动；
8. Sessions pin / collapse；
9. streaming 阶段反馈；
10. 缺少 API key 时不污染 History；
11. 中断任务恢复为可重试状态。

前端完整结果：17 个测试文件、98 个测试全部通过；ESLint 与生产构建通过。

### 认证与云端边界

本地 D1 migrations 已确认无待执行迁移。Cloudflare Worker 的 TypeScript 检查和测试通过：6 个测试文件、15 个测试全部通过，其中包含认证相关契约。

## 未验证与限制

- 未完成真实浏览器中的 `Create account → redirect → authenticated workspace` 提交链路；环境在请求发出前阻止了动作，本地数据库没有新增本轮测试账号。
- 未使用真实 Gemini API key，因此本轮没有评价生成内容质量、长文延迟或真实流式网络退化。
- 当前测试覆盖交互与状态契约，不替代多浏览器视觉回归。

## 下一次人工 smoke test

在可访问本地 Worker 或部署预览的浏览器中，用纯测试信息执行：

1. 注册并确认进入 Workspace；
2. 导入两段测试文本，确认默认进入 Text；
3. 在无 API key 时 Explain，确认错误指向 Settings 且 History 为空；
4. 打开 Close Reading，确认整篇入口与空状态；
5. 打开 History，切换时间排序与原文排序；
6. pin / collapse Sessions，并在 390px 下确认 drawer；
7. 调整字体、字号、行距、行宽，解除联动后单独调整分析字体；
8. 登出再登录，确认 session 与阅读偏好恢复。

人工验证若发现偏差，应优先更新旅程契约，再做小而独立的修复提交。
