# Workspace 阅读体验与信息架构基线

- 状态：Approved for staged implementation
- 日期：2026-08-23
- 分支：`codex/uiux-information-architecture`
- 目标用户：阅读长文、对特定文本反复解释，并回看整篇精读的深度阅读者
- 交付物：已确认产品决策、目标信息架构、低保真布局、状态模型、实施切片和验证计划
- 实施约束：本文是代码改造基线；具体尺寸、文案和视觉细节仍需在实现中验证

## 结论

Workspace 不再以一个“什么都能打开”的 `ContextPanel` 组织体验。目标结构是：

1. **Sessions navigation** 只负责跨 session 的创建、搜索、切换和管理；
2. 打开 session 后，进入明确的 **Text / Close Reading / History** 三种模式；
3. **Explain** 是 Text 模式中锚定特定原文的当前工作面板，不是第四个顶层模式；
4. **Close Reading** 是整篇文本的独立深度解读模式；
5. Close Reading 的原文对照区允许直接 Explain，进入可返回的二级详情；
6. **History** 只在用户明确打开时查询已保存工作，默认按时间排序，可切换为原文顺序；
7. **Reading appearance** 默认统一作用于原文和分析，同时允许用户自由调节。

## 已确认产品决策

### 1. Explain 是帮助，也是可积累的理解记录

- Explain 用于加深对特定文本的理解，可作用于选词、选句、选区或段落。
- 每次生成都自动保存到当前 session，不因关闭面板而丢失。
- 保存对象必须保留精确原文锚点、生成结果、创建时间和后续版本。
- 快速呈现与持久保存是两个独立维度；快速 Explain 不代表临时内容。

### 2. Close Reading 是整篇文本的独立深度解读技能

- Close Reading 不是 Explain 的视觉变体，而是针对整篇文本的深入、细致解读。
- Close Reading 结果自动保存为 session 级分析。
- `Close Read paragraph` 与该语义冲突，不再作为 Close Reading 入口。
- 段落级操作统一归入 `Explain paragraph` / `Analyze paragraph`，最终文案在实现时验证。

### 3. 自动保存与查询历史是两种不同行为

- Explain、Close Reading、Translate、Vocabulary 和 note 都属于 session 内阅读工作。
- 生成或编辑后按各自规则自动保存，不需要“保存到历史”操作。
- 只有当用户进入当前 session 的 History，并浏览、搜索、筛选或重新打开时，才算查询历史。
- 当前刚生成或正在查看的 Explain 属于当前工作上下文，不等于 History 模式。

### 4. 阅读设置默认统一，但允许用户自由调节

- 字体、字号、行距和行宽默认同时作用于原文与 AI 生成的阅读内容。
- UI 提供即时预览和更细粒度的可调范围，不再将大量离散选项堆在长菜单中。
- 默认保持“原文与分析一致”；用户主动解除联动后，才展开分区调整。
- 阅读偏好是用户偏好，不属于 History 条目。其持久化作用域在首个实施版本中保持现有用户级行为。

### 5. 工作区模式与导航层级

- Sessions sidebar 可收起，宽屏可由用户 pin；移动端使用 drawer。
- Session row 不展开 marks、notes 或 outputs，只呈现识别和切换 session 所需信息。
- 打开 session 后提供 `Text` / `Close Reading` / `History` 三种稳定模式。
- Explain 是 Text 模式中的上下文面板，不与 Close Reading 共用同一个无语义的右栏状态。
- Close Reading 的原文对照区允许直接 Explain。触发后，分析侧暂时进入
  `Close Reading → Explain selection` 二级详情，返回时恢复原 Close Reading 和阅读位置。
- History 默认按时间倒序，允许切换为原文顺序。

## 目标信息架构

```text
Workspace
├── Sessions navigation                 跨 session
│   ├── Search / New
│   ├── Session rows                title / last opened / summary
│   └── Collapse / Pin
└── Active session
    ├── Text                             默认模式
    │   ├── Source text
    │   ├── Persistent source anchors
    │   ├── Selection / paragraph actions
    │   └── Current Explain panel
    ├── Close Reading                    整篇深度解读
    │   ├── Source comparison
    │   ├── Close Reading analysis
    │   └── Explain selection detail
    └── History                          session 内查询
        ├── Search / type filter
        ├── Sort: recent / source order
        └── List-detail result view

Reading appearance                           跨模式阅读偏好
```

### 职责边界

| 表面 | 唯一职责 | 不应包含 |
| --- | --- | --- |
| Sessions navigation | 创建、搜索、切换和管理 session | session 内 mark/output 子树、AI 正文 |
| Text | 阅读原文，发起并回看锚定特定文本的工作 | session-wide 搜索和筛选 |
| Current Explain | 呈现当前锚点的 Explain/Translate/Vocabulary/note | 其他锚点的历史索引、整篇 Close Reading |
| Close Reading | 整篇文本的深度解读和原文对照 | session 列表、默认历史索引 |
| Close Reading Explain detail | 解释 Close Reading 原文区的当前选区 | 同时堆叠完整 Close Reading 正文 |
| History | 查询当前 session 已保存阅读工作 | 新建 AI 任务的主入口 |
| Reading appearance | 调整阅读排版并即时预览 | artifact 管理和 session 导航 |

## 为什么现有结构失败

### 1. Context Panel 混合了不同作用域

`ContextPanel.tsx` 同时容纳当前选区、Saved marks、Session outputs、note editor、AI 操作、
artifact history 和 artifact 正文。当前任务、session 内查询和长内容阅读因而抢占同一个 380px 容器。

### 2. Explain 与 Close Reading 空间不一致，语义却不够清晰

Explanation 被当作小号 history content 塞进 Context Panel，Close Reading 则拥有独立 split/focus 窗格；
同时系统又提供 `Close Read paragraph`。范围、深度和布局彼此绑定，用户难以预测结果会在哪里打开。

### 3. 当前工作与 History 查询同屏竞争

用户刚请求的 Explain 可能被 Saved marks 搜索、筛选器和 Session outputs 挤出首屏。
将当前 artifact 移到列表上方只会改变顺序，不会分离“当前工作”与“查询历史”。

### 4. 阅读设置的名称与作用域不一致

当前 Source 与 Close Reading 默认使用不同字体和字号，普通 Explain/Translate/Vocabulary 又不完整遵循
阅读偏好。用户选择“Reading settings”时，无法通过当前 UI 预测哪些内容会变化。

### 5. 状态由残留 artifact 和多个 boolean 间接推导

工具栏的 `Open context panel` 可以因 active artifact 而打开不同目标。导航模式、当前选区、
当前 artifact 和 focus state 缺少显式的层级。

## 外部原则与本项目的适用方式

本设计只借用结构和交互原则，不复制任何产品的视觉风格。

- [Apple Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)：Sidebar 适合宽而平的同级导航。
  **适用：** Sessions 保持平坦，可收起与 pin，不展开 session 内对象树。
- [Atlassian Layout](https://atlassian.design/components/navigation-system/layout) 与
  [Panel](https://atlassian.design/components/panel/usage)：Navigation、main content 和 contextual content 是不同区域。
  **适用：** Explain 可作为 Text 的 contextual panel；History 不进入该 panel。
- [VS Code Views](https://code.visualstudio.com/api/ux-guidelines/views) 与
  [Panel](https://code.visualstudio.com/api/ux-guidelines/panel)：Container、view、item 和 action 需要分层。
  **适用：** Text / Close Reading / History 是 mode；Explain 是当前 source-linked item 的详情。
- [Microsoft progressive disclosure](https://learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-progressive-disclosure-controls)：
  只在相关上下文显示 detail 和 secondary commands。
  **适用：** 字体解除联动、历史版本、删除和重试按需展开。
- [Apple Typography](https://developer.apple.com/design/human-interface-guidelines/typography) 与
  [W3C Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing)：文本需响应用户字号和间距偏好。
  **适用：** Reading appearance 即时反映在原文和分析，布局不依赖固定高度。
- [Microsoft HAX Guidelines](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/)：AI 界面需要清晰的能力范围、
  调用、取消、纠错和恢复路径。
  **适用：** Explain 和 Close Reading 使用真实任务状态，失败时保留 source 和原地重试。

## 低保真布局基线

### 1. Text：无当前 Explain

```text
┌ Sessions ────────── Session title ── [Text] [Close Reading] [History] [Aa] ┐
│ session A │                                                               │
│ session B │                        Source text                            │
│ session C │                  persistent, quiet anchors                   │
│           │                                                               │
└─ collapse └──────────────────────────────────────────────────────────────────┘
```

- Text 是默认模式。
- 无当前 Explain 时不显示空面板，原文保持合理行长并居中。
- Sessions 收起后原文重新居中，不留一块无意义空白。

### 2. Text：当前 Explain

```text
┌── Source text 65–70% ───────────────┬─ Current Explain 30–35% ──────┐
│ exact selection remains highlighted         │ source quote                         │
│                                               │ explanation / translation / vocab    │
│                                               │ retry / copy / close                  │
└───────────────────────────────────────────────┴───────────────────────────────┘
```

- 原文是视觉主体，Explain 不得将原文压缩到不可读行宽。
- 面板关闭只改变 UI 状态，不删除 artifact。
- 新选区生成 Explain 时更换当前面板，较早结果保留在 History。
- 实际 breakpoint 由“原文可读行宽 + Explain 最小宽度”决定，不硬编码为设备名称。

### 3. Close Reading：整篇对照

```text
┌─ Source comparison 35–45% ───┬─ Close Reading 55–65% ──────────┐
│ full source document              │ document title / analysis structure       │
│ linked reading position           │ full close reading                        │
│ selectable text                   │ focus / versions / copy                   │
└────────────────────────────────────┴────────────────────────────────────────┘
```

- 分析是当前模式的视觉主体，与 Text 模式的空间主次相反。
- 尚无整篇 Close Reading 时，该模式显示能力说明和明确的开始操作。
- 再次进入恢复上次 Close Reading 版本和阅读位置，不重新生成。

### 4. Close Reading 内直接 Explain

```text
┌─ Source comparison ─────────┬─ Close Reading > Explain selection ──┐
│ selected range stays highlighted  │ [Back to Close Reading]                 │
│                                     │ source quote                            │
│                                     │ saved explanation                       │
└───────────────────────────────────┴──────────────────────────────────────┘
```

- Explain 暂时替换分析侧正文，不将两篇长内容同时堆叠。
- `Back to Close Reading` 恢复原 Close Reading artifact、版本选择和滚动位置。
- 该 Explain 按普通 Explain 规则自动保存，也可在 History 中打开。

### 5. History：显式 list-detail

```text
┌ History ─ [Search] ─ [All types] ─ [Newest first | Source order] ──┐
├── Saved work list ──────────┬─ Selected result ─────────────┤
│ source quote / type / time     │ complete output                       │
│ one stable row per result     │ Open in Text / Show source            │
└─────────────────────────────────┴────────────────────────────────────┘
```

- 默认为 `Newest first`。
- `Source order` 使锚定内容按原文 offset 排序；session 级 Close Reading 作为独立类型稳定放置。
- 打开条目不重新请求 AI。`Open in Text` 切换到 Text，恢复精确 source 和对应 Explain。

### 6. Reading appearance

```text
Reading appearance

Font          [Literary] [Sans] [Mono]       real preview
Text size     A− ────●──── A+
Line spacing  Tight ───●─── Loose
Line width    Narrow ─────●─ Wide

[x] Keep source and analysis matched
Reset
```

- 更改后立即反映在当前内容，不需要 Apply。
- 解除联动后再展开 Source / Analysis 分区控件。
- 菜单内的字体选项使用实际字体样式预览，不只呈现 Serif/Sans/Mono 字样。

### 7. Mobile

- Sessions 使用 drawer，不占用常驻阅读宽度。
- Text 保持单列；selection actions 使用底部操作区。
- Explain 使用全屏详情或可扩展 bottom sheet，顶部固定 `Back to text`。
- Close Reading 使用全屏分析，在 Source / Analysis 间显式切换。
- Close Reading 内 Explain 使用 `Back to Close Reading`，不跳回 Text 模式。
- History 使用 list → detail drill-down，不在窄屏并排两列。

## 显式状态模型

不再由多个 panel boolean 和残留 artifact ID 推导用户所在界面。实施时的类型应表达以下语义：

```ts
type WorkspaceMode = 'text' | 'close-reading' | 'history';

type ExplainPaneState =
  | { kind: 'closed' }
  | {
      kind: 'artifact';
      origin: 'text' | 'close-reading';
      anchorId: string;
      artifactId: string;
    };

type CloseReadingDetailState =
  | { kind: 'analysis'; artifactId?: string }
  | {
      kind: 'explain';
      closeReadingArtifactId: string;
      anchorId: string;
      artifactId: string;
    };

type HistorySort = 'recent' | 'source';

interface WorkspaceViewState {
  mode: WorkspaceMode;
  sessionsNavigation: {
    open: boolean;
    pinned: boolean;
  };
  explainPane: ExplainPaneState;
  closeReadingDetail: CloseReadingDetailState;
  historySort: HistorySort;
}
```

### 状态不变量

1. Sessions 入口始终打开 session 导航，不因 active artifact 改变目标。
2. 切换 session 后进入 Text，不继承上一 session 的 Explain 或 Close Reading 二级状态。
3. Text 内执行 Explain 只打开当前 Explain pane，不进入 History。
4. Close Reading 只表示整篇深度解读；段落级操作不生成 `close_read` artifact。
5. Close Reading 内 Explain 保留 origin；返回时恢复原 Close Reading artifact、revision 和阅读位置。
6. History 首次进入默认按时间倒序；用户可显式切换为原文顺序。
7. `Show source` / `Open in Text` 始终定位并高亮精确 range，不只高亮所在段落。
8. 关闭面板、切换模式或移动端返回不删除已保存 artifact。
9. Reading appearance 默认同时影响 source 与 analysis，不再为 Close Reading 暗中减小字号。

## 实施切片

每个切片使用独立原子提交。不在同一提交中同时进行大范围组件重命名、数据模型改造和视觉换肤。

### Slice 1：建立模式导航与显式状态

- 在 session header 建立 Text / Close Reading / History 稳定入口。
- 以 discriminated union 替代 `useWorkspacePanels` 中由 boolean 和 artifact ID 组合推导的主模式。
- 将 Sessions 导航与 session 内对象解耦，保留现有搜索、重命名、删除和恢复能力。
- 实现 desktop collapse/pin 与 mobile drawer 状态，不在 session row 下展开 artifacts。
- 在同一切片中同步 `workspace-journey-contract.md` 和对应 journey tests。

### Slice 2：Text 模式与 Current Explain

- 从 `ContextPanel` 抽出只负责当前锚点的 Explain pane。
- Explain、Translate、Vocabulary 和 note 使用同一 source-linked 容器，但保留各自 renderer。
- 保留精确 source range；从 artifact 返回时定位到精确选区。
- 将 `Close Read paragraph` 改为段落 Explain 语义，移动端提供等价入口。
- 删除无 active source 时的 Context dashboard。

### Slice 3：整篇 Close Reading 模式

- Close Reading 仅通过整篇 document command 创建。
- 保留现有 streaming、retry、stop、revision、copy、split 和 focus 能力。
- 调整布局为 source 35–45% / analysis 55–65% 的主次关系，具体临界由内容压力测决定。
- 允许在 source comparison 直接 Explain，分析侧进入可返回的二级详情。
- 保留并恢复 Close Reading artifact、revision 与滚动位置。

### Slice 4：History 查询界面

- 复用现有 Saved marks 和 Session outputs 的搜索/筛选逻辑，移入 main-area list-detail。
- 默认按 `updatedAt/createdAt` 时间倒序，增加 source offset 排序。
- 每条结果显示 source quote、artifact type、time 和稳定摘要。
- `Open in Text` 恢复对应 source 与 artifact，不重新请求。
- 删除 Context Panel 中的 SessionOutputIndex 与 SelectionIndex。

### Slice 5：Reading appearance

- 将现有长 dropdown 改为带即时预览的设置面板。
- 默认将字体、字号、行距和行宽统一应用于 source 和 analysis。
- 移除 Close Reading 字号暗中减 2px 的行为。
- 为字体提供真实预览，确保中文、拉丁文和日文 fallback 可预测。
- 解除联动属于渐进展开；如现有数据结构不支持，先交付统一设置，再独立增加分区偏好。

### Slice 6：删除旧面板与强化失败路径

- 所有转移完成后删除 `ContextPanel` 和旧 panel toggle 语义。
- 消费已存在的 streaming stage，不再为所有 artifact 显示 `Reading closely…`。
- 缺少 API key 时在发起前给出可操作的修复入口，不创建污染 History 的失败 artifact。
- 保留 selection/source，允许原地 retry、stop 和 copy trace。
- 完成键盘、200% zoom、字符串增长和 390px 移动端验证。

## UX contract 迁移规则

`docs/ux/workspace-journey-contract.md` 与 `frontend/tests/workspace/workspaceJourney.test.tsx` 是一对可执行规范。
本文不提前修改当前 Active contract；每个实施切片在改变行为时，必须在同一提交中更新测试与文档。

预计迁移：

- 将所有 `Open Context Panel` 旅程改为明确的 Text Explain、Close Reading 或 History 入口。
- 将 paragraph Close Reading 旅程迁移为 paragraph Explain。
- 将 session-wide output index 从 Context Panel 迁移到 History。
- 将 Source / Close Reading 独立字体 contract 改为默认统一的 Reading appearance contract。
- 新增 Close Reading 内 Explain，并返回原 Close Reading artifact/revision/scroll position 的旅程。
- 新增 History 默认时间倒序与 source order 切换旅程。
- 新增 sidebar collapse/pin 和 mobile drawer 等价导航旅程。

## 可用性与 QA 验证计划

### 核心任务

| 任务 | 成功标准 | 时间目标 |
| --- | --- | --- |
| 收起 Sessions 并继续阅读 | 原文重新居中，session 入口仍可预测 | 5 秒内 |
| 选中文本并 Explain | 精确选区保持高亮，当前 Explain 可见并自动保存 | 20 秒内看到明确状态 |
| 开始并重新打开整篇 Close Reading | 进入独立模式，重开不重新请求 | 入口选择无误 |
| 在 Close Reading 原文中 Explain | 解释保存，一次操作返回原 Close Reading 位置 | 10 秒内完成返回 |
| 在 History 查找旧 Explain | 默认按时间，可切 source order，打开后恢复原文 | 20 秒内 |
| 调整阅读字体、字号和行宽 | 原文与分析即时统一变化，无裁切或水平滚动 | 10 秒内 |

### 测量与阈值

- 5–8 名目标读者的任务完成率目标 `≥ 85%`。
- 记录 time on task、错误模式切换、backtrack 次数和首次入口选择。
- SUS 目标至少 68；核心阅读流目标超过 80。
- 任一核心任务若有超过 20% 用户进入错误模式，不应继续扩大实施范围。

### 工程验证

每个 frontend 切片从 `frontend/` 运行：

- `npm run lint`
- `npm test`
- `npm run build`

浏览器 QA 至少覆盖：

- 390px 移动端、1280px 桌面端和宽屏 pin/collapse；
- 键盘 selection actions、mode navigation、History sort 和返回路径；
- 200% zoom、长标题、法语/德语 UI 字符串增长与中文原文；
- streaming、stop、retry、缺少 API key 和 source 无法解析的失败路径。

## QA 环境记录

- 2026-08-23 已在生产 Cloudflare Worker 完成新测试账号注册，注册后自动进入 `/app`。
- 已在本地 Wrangler + D1 环境使用等价账号完成注册与 session 创建。
- 当前主线在 1280×720 下复现 Context 职责混杂、首屏裁切和 active artifact 影响面板入口的问题。
- 仓库不记录测试账号密码；精确凭据与部署细节保留在 Git 之外。

## 明确不做

- 不恢复已关闭 PR 28/29 的实现。
- 不在 Sessions row 下嵌套 marks、notes 和 outputs。
- 不使用更多 accordion、tabs 或图标压缩旧 ContextPanel。
- 不让 Explain 与 Close Reading 共用一个无作用域的通用右栏。
- 不保留 paragraph Close Reading 的产品语义。
- 不在 History 查询界面中承担当前 Explain 的主呈现。
- 不改变现有 brutalist 视觉语言，不引入新依赖，不在同一切片中顺便视觉换肤。
- 不在一个 PR 中一次性实现所有切片。
