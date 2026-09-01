# Workspace Journey UX Contract

- 状态：Active
- 最近同步：2026-08-23
- 可执行规范：[workspace-journey.test.tsx](../../frontend/tests/workspace/workspace-journey.test.tsx)
- 设计基线：[workspace-information-architecture.md](./workspace-information-architecture.md)
- 浏览器 QA：[workspace-browser-qa-2026-08-23.md](./workspace-browser-qa-2026-08-23.md)

本文档固定 Workspace 新信息架构的关键用户旅程。测试与本文档是一对同步维护的规范：任何用户行为变化都必须在同一次提交中更新两者。

## 范围与边界

当前规范覆盖 session 内的模式导航、Explain、整篇 Close Reading、History、Sessions navigation、Reading appearance，以及关键 streaming / failure 状态。

测试使用 React Testing Library、localStorage fixture 和 mock SSE：

- 默认模拟 `1280px` 桌面宽度；
- 按 accessible role 和 name 操作；
- 不调用真实 Gemini、后端或云同步；
- 验证交互、归属和持久化契约，不替代真实浏览器、视觉回归或模型质量评估。

## 核心 UX 不变量

1. Workspace 只有 `Text`、`Close Reading`、`History` 三个稳定顶层模式。
2. Explain 是锚定特定原文的当前工作详情；生成后自动保存，但不会自动把用户带进 History。
3. 段落级动作是 Explain，不生成 `close_read` artifact。
4. Close Reading 只面向整篇 document，并作为 session 级深度解读自动保存。
5. Close Reading 原文区可以直接打开 Explain；Explain 暂时替换分析侧，返回后恢复同一 Close Reading。
6. History 只有显式打开才出现；默认时间倒序，可切换原文顺序。
7. 从 History 打开 artifact 不重新请求，并恢复精确 source range，而非只定位到段落。
8. Sessions navigation 只负责 session 创建、搜索、切换和管理；宽屏可 pin / collapse，row 不展开 session 内对象树。
9. Reading appearance 默认统一作用于原文和分析；只有用户主动解除联动后才允许分开字体。
10. Streaming 显示真实阶段；缺少 API key 的 preflight failure 不创建污染 History 的失败 artifact。
11. 页面重载后残留的运行中 artifact 恢复为稳定、可重试的 stopped 状态。

## 固定用户旅程

### WJ-01 三种稳定模式

**动作**

1. 打开已有 session，默认进入 Text。
2. 打开 Close Reading。
3. 打开 History。

**必须保持**

- 三个入口始终可见，并通过 `aria-pressed` 明确当前模式。
- 尚无 Close Reading 时显示整篇能力说明和 `Start Close Reading`。
- History 仅在显式打开后呈现，默认排序为 `recent`。

### WJ-02 段落 Explain 自动保存

**动作**

1. 在段落旁选择 `Explain paragraph`。
2. 等待流完成。

**必须保持**

- Text 保持当前模式，并打开 Current Explain。
- 创建 paragraph anchor 和 `explanation` artifact。
- 不创建 paragraph `close_read` artifact。

### WJ-03 整篇 Close Reading

**动作**

1. 进入 Close Reading。
2. 选择 `Start Close Reading`。

**必须保持**

- 请求范围是整个 document。
- 创建 document anchor 和 `close_read` artifact。
- 结果在 Close Reading 分析侧显示并保存。
- 用户选择旧版本后切换模式再返回，恢复仍有效的已选版本，而非强制跳回最新版本。

### WJ-04 Close Reading 内直接 Explain

**前置状态**

- 当前 session 已有整篇 Close Reading 和一个带 Explain 的 saved source。

**动作**

1. 打开 Close Reading。
2. 从原文对照区打开 saved source。
3. 选择 `Back to Close Reading`。

**必须保持**

- Explain 暂时替换分析正文，不和两篇长内容堆叠。
- 面板显示 `Back to Close Reading`。
- 返回后恢复同一 Close Reading 内容，不重新请求。

### WJ-05 History 查询与排序

**动作**

1. 显式打开 History。
2. 查看默认顺序。
3. 切换 `Source order`。

**必须保持**

- 默认按 `updatedAt` 倒序。
- Source order 按 source offset 稳定排列。
- History 使用 session-wide list-detail，不进入 contextual panel。

### WJ-06 从 History 返回精确原文

**动作**

1. 在 History 选择锚定选区的 artifact。
2. 选择 `Open in Text`。

**必须保持**

- 进入 Text 并打开对应 Current Explain。
- 原文精确 range 使用 `<mark>` 恢复，不只高亮所在段落。
- 不发起新的 AI 请求。

### WJ-07 Reading appearance 默认统一

**前置状态**

- Text 与 Close Reading 同屏。

**动作**

1. 打开 Reading appearance。
2. 调整字号和字体。
3. 解除 `Keep source and analysis matched`。
4. 单独修改 Analysis font。

**必须保持**

- 默认原文与分析字体、字号、行距、行宽一致。
- 调整即时预览，不需要 Apply。
- 解除联动前修改字体同时影响两侧；解除后可分开，且不暗中缩小分析字号。

### WJ-08 Sessions pin / collapse

**动作**

1. 打开 Reading sessions drawer。
2. 在宽屏选择 Pin。
3. 选择 Collapse。

**必须保持**

- pinned Sessions navigation 是平坦导航，只呈现 session row 与管理动作。
- pin 状态持久化为用户偏好。
- collapse 后回收阅读宽度，工具栏入口仍可重新打开。

### WJ-09 Streaming 阶段反馈

**动作**

1. 启动整篇 Close Reading。
2. SSE 先发送 `interpret` stage，随后发送结果。

**必须保持**

- 内容到达前显示 `Interpreting the full text…`。
- 完成后阶段文案被正文替代。
- Translate、Vocabulary、Explain 使用与其技能一致的阶段文案，而非统一显示 `Reading closely…`。

### WJ-10 缺少 API key 的 preflight failure

**动作**

1. 在没有 Gemini API key 时执行 paragraph Explain。
2. 打开 History。

**必须保持**

- 缺 key 时页面顶部显示指向 Settings 的黄条入口。
- 发起 AI 后仍只显示该黄条，不另出红色错误。
- source anchor 可保留，便于配置后重试。
- 不创建 failed artifact，History 仍为空。

### WJ-11 中断任务恢复

**前置状态**

- localStorage 有一个带 request id、状态为 running 的 Close Reading。

**动作**

1. 重载 Workspace。
2. 打开 Close Reading。

**必须保持**

- 遗留 artifact 变为 stopped。
- `Retry artifact` 可用。
- 不再显示 `Stop artifact`。

## 维护规则

1. 新增、删除或修改测试时，同步对应 `WJ-*` 场景和核心不变量。
2. 只重构测试但不改变 UX 时，也要更新同步记录并明确行为未变化。
3. 从 `frontend/` 运行 `npm test -- --run tests/workspace/workspace-journey.test.tsx`。
4. UI 交付前另行执行 `npm run lint`、`npm test`、`npm run build` 和真实浏览器 QA。

## 同步记录

| 日期 | 说明 |
| --- | --- |
| 2026-08-23 | 迁移到 Text / Close Reading / History 信息架构；加入 Current Explain、整篇 Close Reading、Close Reading 内 Explain、History 双排序、精确 range、Sessions pin、统一 Reading appearance、streaming stage 与 API-key preflight 契约。 |
| 2026-08-19 | 旧 Context Panel 契约最后一次同步；现由 2026-08-23 新架构取代。 |
