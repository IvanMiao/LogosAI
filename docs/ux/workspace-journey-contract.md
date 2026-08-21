# Workspace Journey UX Contract

- 状态：Active
- 最近同步：2026-08-19
- 可执行规范：[workspaceJourney.test.tsx](../../frontend/tests/workspace/workspaceJourney.test.tsx)

本文档固定 Workspace 当前已经被测试保护的用户旅程。它让产品与工程评审者不必先阅读测试实现，也能判断一次改动是在修复回归，还是有意改变 UX。

测试文件与本文档是一对同步维护的规范。任何对 `workspaceJourney.test.tsx` 的修改，都必须在同一次变更中更新本文档。如果只是重构测试而没有改变行为，也要更新“同步记录”，并明确写出 UX contract 未变化。

## 范围与边界

当前规范覆盖 `WorkspacePage` 内 Close Reading、Context Panel、focus mode、移动端返回、并发流、阅读设置和 artifact 管理的关键连续性。

这些是 React + jsdom 的用户旅程测试：

- 使用 Testing Library 按 accessible role 和 name 操作界面。
- 使用本地 fixture 初始化 document、anchor 和 artifact。
- 使用 mock SSE response，不调用真实 Gemini 或后端。
- 默认模拟 `1280px` 桌面宽度；移动场景单独使用 `390px`。
- 每个场景开始前清空 `localStorage`，并载入同一份两段式 document。

因此，本规范验证交互和状态契约，但不等价于真实浏览器 E2E、视觉回归、模型输出质量或正式可用性测试。

## 核心 UX 不变量

1. Artifact 始终属于创建它的 source；切换 source 或并发完成请求不能串结果。
2. 当前查看的历史 artifact 是明确的用户选择，打开或关闭 focus mode 不得偷偷切回最新结果。
3. Context Panel 每次只突出一个 active artifact；历史结果可以切换，但不把所有全文堆叠在面板中。
4. 页面重载后遗留的运行中任务必须变成稳定、可重试的停止状态。
5. 移动端离开结果回到原文后，可以再次打开同一个结果。
6. Source 与 Close Reading 可以独立选字体，但字号和行距保持协调的阅读尺度。
7. 删除 artifact 或 selection 只影响明确确认的对象及其从属数据，并给出可预测的 fallback。
8. 导入新文本不能删除较早文本；用户可以从 `Reading sessions` 切换回来，并恢复各自的 selection 与 artifact。
9. 文本标题可以由用户修改，重载后必须保留自定义标题。
10. 删除文本只级联删除该文本的 selection 与 artifact，其他文本及其工作不受影响。
11. Reading-session 列表显示每个 session 的 selection 与 reading-entry 数量，帮助用户在切换前判断其中保存了什么。
12. Reading-session 搜索命中原文时，列表提供短摘录和最后打开时间；用户不必展开全文也能确认目标 session。
13. Context Panel 提供当前 session 全部 output 的可筛选索引；从中打开任一 output 会同步切换到其 source。
14. 导入时可先命名 session；自定义标题优先于文件名或自动生成的标题，并在重载后保留。

## 固定用户旅程

### WJ-01 返回较早段落的分析

**前置状态**

- Document 有两个段落，尚无 Close Reading。
- 两次分析请求分别返回第一段和第二段的结果。

**用户动作**

1. 对第一段执行 Close Read。
2. 打开 focus mode，确认第一段结果后按 `Escape` 返回。
3. 对第二段执行 Close Read。
4. 通过 saved selection 返回第一段。

**必须保持**

- focus mode 展示当前第一段结果，并能通过 `Escape` 关闭。
- 第二次分析完成后展示第二段结果。
- 返回第一段时重新展示第一段结果，并且不同时展示第二段结果。
- 整个旅程只发出两次分析请求，不因查看历史结果重新请求。

### WJ-02 从较新的 Explain 返回较早的 Close Reading

**前置状态**

- 同一段落同时有较早的 Close Reading 和较新的 Explanation。

**用户动作**

1. 打开 Context Panel 并选择该段落。
2. 先查看默认选中的较新 Explanation。
3. 打开 output history，选择较早的 Close Reading。

**必须保持**

- 默认展示较新的 Explanation。
- 用户选择历史项后展示较早的 Close Reading，而不是继续展示 Explanation。
- 界面进入专用 Close Reading pane，不留下重复的 Context Panel。

### WJ-03 Focus mode 保留用户选中的历史版本

**前置状态**

- 同一段落有最新和较早两个 Close Reading revision。

**用户动作**

1. 打开 Context Panel，默认看到最新版本。
2. 进入 focus mode，并从 output history 选择较早版本。
3. 按 `Escape` 离开 focus mode。

**必须保持**

- focus mode 中展示用户选择的较早版本。
- 离开 focus mode 后仍展示较早版本。
- 关闭 focus mode 不得把 active artifact 重置为最新版本。

### WJ-04 重载后恢复中断的 Close Reading

**前置状态**

- 本地存储中有一个带 `requestId`、状态为 `running` 的部分 Close Reading，模拟页面在请求期间被重载。

**用户动作**

1. 重新进入 Workspace。
2. 打开 Context Panel。

**必须保持**

- 遗留任务显示为 `stopped`，不能永远保持运行中。
- `Retry artifact` 可用。
- 不再显示 `Stop artifact`，因为旧请求已经不存在。

### WJ-05 移动端返回原文后重新打开结果

**前置状态**

- viewport 宽度为 `390px`。
- 当前段落已有保存的 Close Reading。

**用户动作**

1. 打开 Context Panel。
2. 在移动端 dialog 中阅读 Close Reading。
3. 点击 `Back to text` 返回 Reading Surface。
4. 再次打开 Context Panel。

**必须保持**

- 移动端以名为 `Close reading` 的 dialog 展示结果。
- 返回后 dialog 关闭，Reading Surface 仍存在。
- 再次打开时恢复同一个已保存结果。

### WJ-06 并发段落流不串 source

**前置状态**

- 两个段落的 Close Reading 流可以重叠运行。

**用户动作**

1. 启动第一段 Close Read。
2. 在第一段尚未完成时启动第二段 Close Read。
3. 先让第一段流完成，再让第二段流完成。
4. 返回第一段的 saved selection。

**必须保持**

- 两个动作产生两个独立请求。
- 第一段在后台完成时，当前第二段视图不能显示第一段结果。
- 第二段完成后展示第二段结果。
- 返回第一段时展示第一段结果，并隐藏第二段结果。

### WJ-07 Source 与 Close Reading 的阅读设置协调但独立

**前置状态**

- 当前段落有一个 Close Reading。
- 默认 source 为 Serif `18px`，Close Reading 为 Sans `16px`，二者行距均为 `1.75`。

**用户动作与必须保持**

1. 选择 Large：source 变为 `20px`，Close Reading 变为 `18px`。
2. 仅把 source font 改为 Mono：Close Reading 继续使用 Sans。
3. 仅把 Close Reading font 改为 Serif：source 继续使用 Mono。
4. 选择 Compact line spacing：Close Reading 行距变为 `1.5`。
5. 选择 Small：source 变为 `16px`，Close Reading 变为 `15px`。

字体选择彼此独立；字号使用各自适合的值随同一 size preference 协调变化；行距 preference 对阅读内容保持一致。

### WJ-08 切换和删除 selection outputs

**前置状态**

- Active selection 有较新的 Explanation 和较早的 Translation。
- Workspace 还包含另一个 saved selection 和一个 paragraph Close Read source。

**用户动作**

1. 打开 Context Panel。
2. 从 output history 切换到 Translation。
3. 删除 Translation 并确认。
4. 关闭 active selection，查看分组列表。
5. 删除原 active selection 并确认。

**必须保持**

- Context Panel 默认只展示最新 Explanation，不堆叠 Translation 全文。
- 切换后只展示 Translation，不同时展示 Explanation 全文。
- 删除 Translation 使用确认 dialog；完成后回退到仍存在的 Explanation。
- 关闭 active selection 后，列表分别显示两个 saved selections 和一个 Close Read source。
- 删除 selection 前明确提示它会同时删除一个 attached output。
- 确认后同时删除该 selection 及其 attached artifact；另一个 selection 和 paragraph Close Read 不受影响。

### WJ-09 删除一个 Close Reading revision 后回退

**前置状态**

- 同一段落有最新和较早两个 Close Reading revision。

**用户动作**

1. 打开 Close Reading outputs 并选择较早版本。
2. 删除当前较早版本并确认。

**必须保持**

- 删除前明确展示用户选中的较早版本。
- 删除后自动回退到仍存在的最新版本。
- 已删除内容不再显示，本地只保留一个 revision。

### WJ-10 切换文本并恢复阅读工作

**前置状态**

- 第一篇文本已有 active paragraph source 和保存的 Close Reading。

**用户动作**

1. 从 `Reading sessions` 新建并粘贴第二篇文本。
2. 在新建 session 时可选择输入自定义标题。
3. 再次打开 `Reading sessions`，搜索第二篇原文中的词语，确认短摘录与最后打开时间，并确认第一篇 session 的 reading-entry 数量后切换回来。
4. 打开 Context Panel。

**必须保持**

- 新建第二篇文本不会替换或删除第一篇文本。
- Session 列表显示第一篇文本有一个 reading entry。
- 原文搜索结果仅显示命中上下文，不显示整篇原文；自定义标题替代自动标题。
- 切回第一篇文本后恢复其 active source 和已保存的 Close Reading。
- 切换过程不会重新请求分析。

### WJ-13 从 session-wide output index 打开其他 selection 的结果

**前置状态**

- 同一篇 session 有两个 saved selection，各自都有 complete output。
- 当前 active selection 是第一个。

**用户动作**

1. 打开 Context Panel，并展开 `Session outputs`。
2. 搜索第二个 selection 的 output 文本。
3. 打开唯一命中的 output。

**必须保持**

- 索引覆盖当前 session 的所有 output，不受当前 active selection 限制。
- 搜索命中 output 正文时有明确提示。
- 打开 output 后，Context Panel 切换到对应 source 并显示该 output。

### WJ-11 重命名文本并在重载后恢复

**前置状态**

- Workspace 已打开一篇有自动生成标题的文本。

**用户动作**

1. 点击工具栏标题进入编辑。
2. 输入自定义标题并按 `Enter` 保存。
3. 重载 Workspace。

**必须保持**

- 保存后工具栏立即显示自定义标题。
- 自定义标题写入文档库，重载后不被自动标题覆盖。
- 重命名不改变原文内容。

### WJ-12 删除文本并隔离级联数据

**前置状态**

- 第一篇文本有 paragraph source 和 Close Reading。
- 第二篇文本仍需保留。

**用户动作**

1. 在 `Reading sessions` 请求删除第一篇文本。
2. 在确认 dialog 中选择 `Delete session`。

**必须保持**

- 删除确认明确说明会同时删除 selection、note 和 output。
- 第一篇文本及其 anchor、artifact 被删除。
- 第二篇文本继续显示且内容不变。

## 维护规则

修改可执行规范时，在同一次变更中执行以下检查：

1. 新增或删除测试：同步新增或删除对应的 `WJ-*` 场景。
2. 修改用户动作、前置 fixture 或 assertion：同步修改对应场景和核心 UX 不变量。
3. 仅重命名或重构测试：确认场景语义未变化，并更新下面的同步记录。
4. 更新本文档顶部的“最近同步”日期。
5. 从 `frontend/` 运行 `npm test -- workspaceJourney.test.tsx`。

## 同步记录

| 日期 | 说明 |
| --- | --- |
| 2026-08-19 | WJ-10 增加导入前命名、原文搜索短摘录和最后打开时间；新增 WJ-13，固定 session-wide output 索引与跨 selection 打开行为。 |
| 2026-08-09 | 将 library UI 统一为 Reading sessions；WJ-10 增加 selection/entry 数量，WJ-12 更新 session 删除文案。 |
| 2026-08-02 | 新增 WJ-10 至 WJ-12，固定多文本切换、标题重命名与文档级联删除契约。 |
| 2026-08-01 | 根据现有九条 `workspaceJourney` 测试建立初始 UX contract；未改变测试行为。 |
