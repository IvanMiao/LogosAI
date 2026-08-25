# Reading Workbench 技术设计探索

- 状态：Proposed，供确认与分阶段实施规划使用
- 日期：2026-08-25
- 当前分支：`codex/compact-session-chrome`
- 范围：信息架构、前端状态、组件边界、响应式布局、History 与 session 恢复
- 非目标：本次不修改产品代码，不改变现有视觉语言，不重命名 **History**

## 结论

本轮设计可以在现有 React + Vite + TypeScript + Tailwind CSS + Radix primitives 技术栈中完成，**不需要更换框架，也不建议引入 MUI、Ant Design、Chakra、Mantine 等完整 UI library**。

决定体验质量的主要因素不是新的组件皮肤，而是以下结构调整：

1. 将“用户去了哪里”和“阅读画布怎样排列”拆成两个独立状态；
2. 将 Source 与 Analysis 建模为两个平等、可独立滚动的阅读 pane；
3. 将 Close Reading 与 Explain 建模为 Analysis pane 内的内容层级；
4. 保留 **History** 名称，将它作为 session 内查询目的地，而不是一种 pane 布局；
5. 将 session 切换、pane 滚动位置、当前 artifact 和返回路径建模为显式状态；
6. 复用现有设计 token、Radix primitive、Lucide 图标和自定义可访问 resize 行为。

第一阶段建议不新增运行时依赖。只有在实际复杂度或性能达到明确阈值后，再评估专项 headless library。

### 已确认的界面方向

- 桌面端 Reader 默认是 Source 与 Analysis 并列的双栏工作台；双栏不是第三个内容目的地，而是默认空间状态。
- `Split` 不再以与 Source、Analysis 同等重量的文字标签出现，改为紧凑的三态布局控件：`source focus / dual pane / analysis focus`。
- 双栏中间的 separator 可直接拖动，初始比例为 `42 / 58`，用户可按阅读任务调整两侧宽度。
- 视觉优先级从高到低为：正在阅读的正文或分析、与其相关的局部标题、session 上下文、全局品牌与工具。
- 保留 **History** 名称和独立入口；它不是布局状态。

## 产品与界面模型

### 对象层级

```text
Library
└── Session                              一次阅读
    ├── Source                           固定原文
    ├── Document-level artifacts         全文级
    │   └── Close Reading
    │       └── revisions
    ├── Anchored artifacts               选段级
    │   ├── Explain
    │   ├── Vocabulary
    │   ├── Translation
    │   └── Note
    └── History                          session 内全部产物的查询界面
```

现有 `WorkspaceDocument.id` 可以继续充当 session identifier。首个实施版本无需同时重命名数据类型或修改 API contract；产品文案使用 Session，内部类型迁移可以后置。

### 两个相互独立的 UI 维度

```text
Destination: reader | history
Reader layout: source | split | analysis
Analysis content: close-reading | anchor-artifact
```

推荐工具栏结构：

```text
[L] [Session title ▾]                         [▯ | ◫ | ▯] [History] [⋯]
                                                 source dual analysis
```

- 布局控件是紧凑的 icon segmented control，不再显示显眼的 `Split` 文字；双栏图标是桌面端默认选中状态。
- 三个图标只改变 reader canvas 的空间排列，不代表三个内容栏目。每个按钮仍提供明确的 accessible name 与 tooltip，例如 `Show source only`、`Show source and analysis`、`Show analysis only`。
- 控件视觉尺寸建议为 `28–32px`，但可点击区域保持至少 `40px`；选中态使用现有强调色和 filled icon，未选中态使用 outline icon。
- `History` 保留当前名称，进入 session-wide 查询界面。
- 从 History 返回 reader 时恢复进入 History 前的 layout、pane 滚动位置和 Analysis 内容。
- Close Reading 不再与 Source、Split、History 共用一个枚举层级。
- 用户选择单栏时属于临时 focus mode；再次选择双栏图标即可回到先前的 pane 比例与两侧滚动位置。

## 当前技术栈判断

| 能力 | 当前实现 | 判断 |
| --- | --- | --- |
| 应用框架 | React 19、Vite 7、TypeScript strict | 足够，不更换 |
| 路由 | React Router 7 | 足够，可加入 session/artifact deep link |
| 样式 | Tailwind CSS 4、CSS variables | 足够，原生支持 container queries |
| 无样式 primitive | Radix Dialog、Dropdown、Select、Separator、Slot | 继续按需增加单个 primitive，不安装完整设计系统 |
| 图标 | Lucide React | 继续使用，避免混入第二套图标语言 |
| Markdown | react-markdown | 足够呈现 AI artifact |
| pane resize | 自定义 `useCloseReadingResize` | 已有 pointer、keyboard、持久化基础，应先泛化 |
| History | 客户端筛选、排序、list-detail | 中小规模足够；规模增长后再分页或虚拟化 |
| view state | `WorkspaceMode` + 多个 boolean/id | 需要重构为 reducer 和判别联合类型 |

Tailwind CSS 4 已内置 container queries，无需引入额外 responsive/layout framework。[Tailwind responsive design](https://tailwindcss.com/docs/responsive-design)

## 前端状态模型调整

### 当前问题

当前 `useWorkspaceViewState` 将以下内容混在一起：

- `mode: text | close-reading | history`；
- `isExplainOpen`；
- `explainOrigin`；
- focused/selected Close Reading id；
- source reveal counter。

这些字段会形成不合法组合，例如 `history + isExplainOpen`，也迫使 `ReaderWorkspace` 根据 artifact 和多个 boolean 推断应该呈现哪个 pane。

### 建议状态

```ts
type WorkspaceDestination = 'reader' | 'history';
type ReaderLayout = 'source' | 'split' | 'analysis';

type AnalysisRoute =
  | {
      kind: 'close-reading';
      artifactId: string | null;
    }
  | {
      kind: 'anchor-artifact';
      anchorId: string;
      artifactId: string | null;
      returnTo: { kind: 'close-reading'; artifactId: string | null } | null;
    };

interface SessionViewSnapshot {
  destination: WorkspaceDestination;
  readerLayout: ReaderLayout;
  analysisRoute: AnalysisRoute;
  sourceScrollTop: number;
  analysisScrollTop: number;
}
```

使用 `useReducer` 管理相关转换，不引入 Redux、Zustand 或 XState。React 官方建议将彼此关联、同时变化的复杂状态集中到 reducer，减少冗余状态和不一致组合。[React state management](https://react.dev/learn/managing-state)

建议 action：

```text
OPEN_HISTORY
RETURN_TO_READER
SET_READER_LAYOUT
OPEN_CLOSE_READING
OPEN_ANCHOR_ARTIFACT
BACK_TO_CLOSE_READING
SELECT_CLOSE_READING_REVISION
SWITCH_SESSION
RESTORE_SESSION_VIEW
```

状态转换本身应使用纯函数，并为每个 action 编写独立单元测试。

### 哪些状态进入 URL

建议路由逐步演进为：

```text
/app/sessions/:sessionId
/app/sessions/:sessionId/history
/app/sessions/:sessionId?artifact=:artifactId
```

- Session 和 History destination 进入 URL，支持返回、刷新和 deep link。
- 当前 artifact 可以进入 query parameter，便于从 History 精确回到结果。
- pane 比例、滚动位置和 `source/split/analysis` layout 默认不进入 URL，属于设备级阅读偏好。
- 实施期间保留 `/app` 兼容入口，自动跳转到 active session。

## 组件边界调整

推荐从当前 `ReaderWorkspace` 的集中条件分支拆成以下边界：

```text
ReadingWorkbench
├── WorkspaceToolbar
│   ├── SessionSwitcherTrigger
│   ├── ReaderLayoutControl
│   └── HistoryTrigger
├── SessionNavigator
├── ReaderCanvas
│   ├── SourcePane
│   ├── PaneResizeHandle
│   └── AnalysisPane
│       ├── CloseReadingView
│       └── AnchorArtifactView
├── HistoryWorkspace
└── WorkspaceDialogs
```

职责要求：

- `ReadingWorkbench` 只选择 destination 和连接 controller。
- `ReaderCanvas` 只负责 `source/split/analysis` 布局，不查询 artifact。
- `AnalysisPane` 根据 `AnalysisRoute` 选择全文细读或选段 artifact。
- `HistoryWorkspace` 保持显式 destination，不进入 Analysis pane。
- Source、Analysis 和 History 的搜索/排序 selector 与 JSX 分离。
- 高频 scroll/resize 数值存入 ref，在切换或卸载时提交，避免每个 scroll event 触发 React render。

## 双文本区与响应式实现

### 布局策略

使用 CSS Grid + CSS custom property：

```text
source only:   minmax(0, 1fr)
dual pane:     minmax(24rem, var(--source-width)) resize-handle minmax(26rem, 1fr)
analysis only: minmax(0, 1fr)
```

- 桌面端首次进入 session 默认使用双栏，初始比例为 `42 / 58`；这不是需要用户主动选择的模式。
- Source 和 Analysis 都必须保持自己的可读行长，而不是让文字铺满 pane。
- 两个 pane 独立滚动；切换 single/split 不重置 scrollTop。
- 分隔器支持 pointer drag、方向键、Home/End、双击恢复 `42 / 58` 默认比例。
- pane 隐藏后不删除 artifact state；恢复时回到原内容。

### 可拖动比例

- separator 的可见线可以保持 `1px`，实际 hit area 使用 `12–16px`，避免为了易拖动而制造沉重的视觉分隔。
- hover、drag 与 keyboard focus 时，用现有强调色将中心线增强为 `2px`；鼠标使用 `col-resize` cursor，不加入高频装饰动画。
- Source 建议限制在工作区的 `32%–68%`，Analysis 使用余下空间；两侧最小宽度同时受各自可读行宽约束。
- 拖动过程中直接更新 CSS custom property，并使用 pointer capture；不要在每个 `pointermove` 中触发整棵 React tree render。
- 方向键按小步调整，`Shift + Arrow` 按大步调整；`Home`、`End` 到安全边界，双击 separator 恢复默认比例。
- 用户比例按 session、按设备本地保存；跨设备同步不是首版要求。focus mode 不覆盖已保存比例。
- 当容器不足以容纳两个最小 pane 时自动进入单栏，但保留用户的双栏偏好；空间恢复后重新显示双栏。

## 内容优先的视觉层级

### 垂直空间预算

目标不是继续增加横向长条，而是让全局上下文和 pane 上下文各只占一层：

```text
Workspace bar      48px 左右：品牌、session、紧凑布局控件、History
Pane header        36–40px：Source 或 Close Reading / Explain 的局部上下文
Reading content    占据其余可视区域
```

- 品牌与 session title 合并在同一条 workspace bar，不再形成两个连续的 full-width header。
- `Close Reading`、`Explain`、版本与返回动作属于 Analysis pane header，不再增加跨越整个工作区的第三条 bar。
- 桌面端从 viewport 顶部到正文起点建议控制在 `88–96px` 内。
- pane header 可以在自己的 pane 内 sticky；两个 pane 独立滚动时，不让其中一侧的 scroll 随机推走整个 workspace bar。
- session title 单行截断，完整标题通过 switcher 或 tooltip 可达；words、阅读进度、版本等 metadata 不与标题争夺同一视觉重量。

### 字号与行宽

保留现有字体与 brutalist 视觉语言，只建立角色清晰的小型 type scale：

| 角色 | 建议字号 | 行高 | 使用方式 |
| --- | --- | --- | --- |
| Source 正文 | `17px`，可在 `16–18px` 内调校 | `1.65–1.75` | 阅读主角；正常字重，保持可选择 |
| Analysis 正文 | `16px` | `1.6–1.7` | 与原文接近但略低一层，避免争抢 |
| Analysis section heading | `19–22px` | `1.2–1.3` | 稳定分隔长分析，不依赖更多边框 |
| Session title / pane title | `14–15px` | `1.2–1.35` | 中等字重，单行显示 |
| Toolbar action | `13–14px` | `1.2` | 紧凑但不低于可读下限 |
| Metadata / eyebrow | `12–13px` | `1.3` | 弱化颜色；大写时增加少量 letter-spacing |

- Source 与 Analysis 的长段落都限制在约 `60–75ch`，在宽 pane 中通过内层 reading column 居中，而不是无限拉长行宽。
- 正文不使用两端对齐；使用 start alignment，段落间距约为 `0.8–1em`。
- 正文下方的 Explain、Vocabulary 等结果继续沿用 Analysis 的字号体系，不再创造更大的“AI 输出”字体。
- 动态 words、progress、版本编号使用 tabular numerals，避免数字变化造成控件位移。
- 最终数值需要在现有实际字体、中法英混排、200% zoom 和长段落上视觉校准；这些值是设计 token 起点，不是散落在组件中的 hard-coded exception。

### 边距与阅读密度

- 使用现有 `4px` 基础 spacing scale；界面层级优先由留白表达，减少重复边框和横线。
- pane 内容区桌面端建议 `padding-block: 32–48px`、`padding-inline: 32–48px`；容器变窄时降到 `24px`，移动端降到 `16–20px`。
- pane header 使用 `12–16px` inline padding，与正文 reading column 的起始边保持明确对齐。
- 段落内部间距小、section 之间间距至少为其两倍，例如段落 `12–16px`、section `32–40px`。
- 双栏 separator 两侧不额外堆叠卡片边框；结构由空间、pane header 和 separator 本身表达。
- 选择 action bar、layout control、History 等工具使用现有强调色；大面积正文背景保持安静，让选段和当前分析成为主要视觉焦点。

### 单栏与移动端

- Source only 与 Analysis only 都让 reading column 在可用 pane 中居中，仍保持最大行宽，不把内容铺满窗口。
- 窄屏只显示一个 pane，直接在 Source、Analysis、History 之间切换，不展示双栏图标或不可用 separator。
- 移动端正文保持至少 `16px`；内容边距 `16–20px`，pane header 与主内容共享对齐边。
- 从移动端返回桌面时恢复之前的双栏比例，而不是把移动端单栏选择写回桌面偏好。

### 不再只依赖 viewport breakpoint

当前 `useWorkspaceViewport` 使用固定 `1024px` viewport query。新 canvas 应根据**实际可用容器宽度**决定能否维持 Split：

1. CSS container queries 处理 pane header、工具栏文字和局部控件换行；
2. 一个轻量 `ResizeObserver` hook 判断 reader canvas 是否容得下两个最小 pane；
3. 当用户请求 Split 但空间不足时，降级为单 pane，并保留其 Split 偏好；空间恢复后再恢复 Split；
4. Session sidebar 展开、浏览器缩放和应用窗口 resize 都通过同一 capacity 逻辑处理。

不建议仅用 `xl:` 决定双栏，因为 pinned session navigation 会改变真实可用宽度。

### 是否引入 `react-resizable-panels`

结论：**第一阶段不引入，先泛化现有 hook。**

现有 `useCloseReadingResize` 已具备本产品最重要的功能：pointer capture、键盘调整、ARIA value 更新和宽度持久化。将它改为 `useReadingCanvasLayout`，比立刻迁移第三方组件更小、更可控。

如果未来出现以下任意两项，再做一次 dependency spike：

- 多组嵌套 pane；
- pane 拖拽重排；
- 多个可折叠 group；
- 复杂 imperative panel API；
- 自定义实现的无障碍行为开始重复或难以维护。

候选库是 [`react-resizable-panels`](https://github.com/bvaughn/react-resizable-panels)。它是 headless panel primitive，官方建议使用 separator 改善键盘可访问性；采用前必须验证其 DOM、焦点顺序和尺寸约束能否保持当前 brutalist 视觉与阅读行宽。

## Explain、Vocabulary 与选区操作

选区操作需要区分“触发器位置”和“结果呈现位置”：

```text
Source selection
└── contextual actions
    ├── Vocabulary / short Translation -> 小型临时结果
    ├── Explain -> Analysis pane drill-in
    └── Note -> 小编辑器，可展开到 Analysis pane
```

技术上保持所有持久 artifact 继续锚定 `TextAnchor`：

- `document` scope 对应全文 Close Reading；
- `paragraph/selection` scope 对应 Explain、Vocabulary、Translation、Note；
- `AnalysisRoute.returnTo` 取代当前 `explainOrigin` boolean 组合；
- Back 操作恢复原 Close Reading revision 和 analysis scrollTop；
- 打开选段 artifact 时 Source 使用现有 offset/hash resolver 恢复精确 `<mark>`。

### 是否引入 floating-position library

结论：**暂不引入；边界碰撞问题被真实复现后再评估。**

若选区 action bar 在窄 pane、缩放或接近视口边缘时持续出现碰撞，可评估 `@floating-ui/react`，只用其定位和 collision middleware，不采用新的视觉组件系统。在没有可复现问题前，继续维护现有 selection placement，避免依赖扩张。

## History 设计与技术结构

名称保持 **History**。它仍然是 session 内所有已保存阅读工作的显式查询界面。

History 推荐提供三种组织区，而不是重命名目的地：

```text
History
├── Overview       全文 Close Reading 与 revisions
├── Source order   按原文位置组织选段 artifact
└── Recent         按时间组织全部 activity
```

首个版本不需要数据库迁移：

- `anchor.scope === 'document'` 的 `close_read` 聚合到 Overview；
- 其余 artifact 根据 `anchor.startOffset` 形成 Source order；
- Recent 继续根据 `updatedAt` 排序；
- Close Reading revisions 可先按相同 document anchor + artifact type 客户端分组；
- 点击任何 History 条目都进入对应 session、恢复 source anchor，并打开正确 Analysis route。

建议增加纯 selector：

```text
selectCloseReadingSeries(entries)
selectHistoryOverview(entries)
selectHistorySourceGroups(entries)
selectRecentHistory(entries)
```

### History 性能

当前 DOM list 对正常阅读 session 足够。先使用：

- `useDeferredValue` 延迟搜索结果更新；
- memoized selector；
- History detail 与 list item 分离；
- 对屏外复杂 detail 使用 `content-visibility: auto`；
- 避免在每个 item 中重复解析完整 Markdown。

只有单个 session 稳定出现约 `150–200+` 可见条目，或性能测试显示滚动/筛选掉帧时，才引入 [`@tanstack/react-virtual`](https://tanstack.com/virtual/latest/docs/introduction)。它是 headless virtualizer，不附带样式，适合保留现有视觉；但过早虚拟化会增加动态高度、键盘焦点、搜索定位和返回原文的复杂度。

## Session 切换与恢复

继续使用现有 Sessions drawer 和 pinned sidebar 的基础能力，不引入新的 navigation framework。

建议行为：

- 顶部 session title 同时是 SessionSwitcher 入口；
- 宽屏可 pin 平坦 session list，移动端使用 Radix Dialog/Drawer；
- row 只显示 title、source、最近打开时间和少量状态，不展开 artifact tree；
- 切换前保存当前 `SessionViewSnapshot`；
- 切换后先恢复 destination/layout，再恢复 Source 与 Analysis scroll；
- 从 History 打开另一个 session 的 deep link 时，先切 session，再选择 artifact；
- active session 可以继续同步到用户偏好；精确 scrollTop 默认保留在设备本地，不跨设备同步。

如果未来增加全局 command palette，可先使用现有 Radix Dialog + 原生过滤实现。只有命令数量和快捷操作范围明显扩大时再评估 `cmdk`。

## 数据与 API 调整

### 第一阶段：无需 schema migration

现有模型已经包含：

- `WorkspaceDocument`；
- document/paragraph/selection `TextAnchor`；
- note/explanation/translation/vocabulary/close_read `Artifact`；
- `createdAt`、`updatedAt`、status、request/trace id；
- per-document active anchor。

这些字段足够支持新的空间模型和 History 分组。

### 后续才可能需要的字段

只有出现明确产品需求后再增加：

```text
artifact.seriesId         显式表示 Close Reading revision series
artifact.parentArtifactId 表示派生/分支 artifact
artifact.pinnedAt         区分普通记录与用户重点保留内容
session.summary           session switcher 的稳定摘要
```

不要为了新的 UI 层级提前改变 Worker API 或 D1 schema。

## UI library 与 framework 决策

| 候选 | 决策 | 原因/采用条件 |
| --- | --- | --- |
| React/Vite | 保留 | 当前 SPA、streaming 和本地状态模型足够 |
| Tailwind CSS 4 | 保留 | 已支持 tokens、container queries 和现有视觉语言 |
| Radix primitives | 保留并按需单包增加 | 无样式、可访问、不会强迫视觉换肤 |
| MUI / Ant Design / Chakra / Mantine | 不引入 | 完整设计系统会带来样式覆盖、bundle 和行为迁移成本 |
| shadcn/ui 全量迁移 | 不做 | 当前已使用相同 primitive 思路，只需维护项目自己的组件层 |
| Redux / Zustand | 不引入 | workspace view state 是局部状态，`useReducer` 足够 |
| XState | 暂不引入 | 当前状态机规模尚不足以抵消学习与依赖成本 |
| react-resizable-panels | 条件性候选 | 仅在 pane 结构扩展到多组/嵌套/重排时采用 |
| @floating-ui/react | 条件性候选 | 仅用于已复现的 selection toolbar collision |
| @tanstack/react-virtual | 延后 | History 达到规模或有性能证据后采用 |
| Framer Motion / GSAP | 不引入 | pane/layout 过渡用 CSS transform/opacity 即可，阅读界面应克制运动 |
| Tiptap / ProseMirror | 不引入 | Source 是阅读与锚定表面，不是富文本编辑器 |

## 性能边界

1. Source 与 Analysis pane 组件独立，切换 Analysis artifact 不重建 Source DOM。
2. scrollTop、drag width 等 transient value 使用 ref，不在 pointermove/scroll 中持续 setState。
3. 搜索、History 排序和 Markdown detail 分开渲染。
4. Session switch 时独立数据请求并行发起，避免顺序 waterfall。
5. 重型 History 或 library UI 在第一次打开时再加载；是否 dynamic import 以 bundle analysis 为依据。
6. 只有 profiler 证据出现后才增加 `memo`，避免把简单 JSX 全面包裹。

## Accessibility 不变量

- 紧凑 layout control 使用 `radiogroup` 或 `aria-pressed` buttons；图标按钮必须有明确 accessible name、tooltip、选中态和 focus ring，不能只靠图形差异传达状态。
- 视觉图标可保持 `28–32px`，但 pointer hit area 至少 `40px`，并避免与相邻 History/overflow 控件的点击区域重叠。
- split separator 保持 `role="separator"`、`aria-orientation`、`aria-valuemin/max/now` 和键盘操作。
- separator 的 `aria-valuetext` 应表达 Source/Analysis 当前比例；拖动时无需连续播报每个像素变化，结束或键盘步进后再更新可感知状态。
- 从 History 打开 artifact 后，焦点移动到 Analysis heading；Source anchor 同时可通过明确动作跳转。
- `Back to Close Reading` 恢复内容后，将焦点返回 pane heading 或原触发器。
- mobile 只显示一个 pane，DOM reading order 与视觉顺序一致，不用 CSS 隐藏造成重复朗读。
- streaming 状态保持 `aria-live`，切换 pane 不丢失 Stop/Retry。
- reduced motion 下禁用 pane enter/exit 位移动画，仅保留即时状态变化。

## 测试策略

### Reducer 单元测试

- Source → Split → Analysis 不改变 Analysis route；
- 新 session 在容量足够时默认进入 Split；空间不足时进入单栏但保留 Split 偏好；
- Reader → History → Reader 恢复之前 layout；
- Close Reading → Explain → Back 恢复 artifact 和 scroll；
- switch session 保存并恢复各自 snapshot；
- focus mode 不覆盖已保存 pane ratio，双击 separator 恢复 `42 / 58`；
- 空 Close Reading、deleted artifact 和无效 deep link 有稳定 fallback。

### 组件与旅程测试

- History 名称、入口和显式 destination 保持不变；
- layout control 保持紧凑但可通过 accessible name 清楚区分 source only、dual pane、analysis only；
- Split 中两个 pane 独立滚动；
- separator 支持 pointer、keyboard、最小 pane 约束与比例本地恢复；
- Source only / Analysis only 不卸载或丢失另一侧状态；
- History Overview、Source order、Recent 分组正确；
- session row 不出现 artifact 子树；
- 缺少 API key、streaming、stop、retry 与删除路径不回归。

### 浏览器 QA

- 极宽桌面、常见笔记本、窄窗口、390px mobile；
- pinned/unpinned Session navigation；
- 200% zoom、长 session title、中/法/德文案增长；
- separator pointer + keyboard、`32 / 68` 边界、双击复位和拖动期间文本不误选；
- Source `60–75ch` 行宽、正文 `16–18px`、pane padding 与顶部 `88–96px` 空间预算；
- pane focus、browser back、deep link 和刷新恢复；
- 100、200、500 条 History fixture 的筛选和滚动性能。

## 分阶段实施建议

### Slice 0：低保真原型，不接数据

- 验证紧凑 layout control、默认双栏、可拖动 separator 与 History 的层级；
- 验证正文行宽、字号、pane padding 和顶部 chrome 空间预算；
- 验证 Source/Split/Analysis、History、mobile 单 pane；
- 暂不改变现有 journey contract。

### Slice 1：显式 reducer，不改变视觉

- 用 `destination + readerLayout + analysisRoute` 替换 `WorkspaceMode + boolean`；
- 保持当前 UI 输出不变；
- 补齐 reducer 测试。

### Slice 2：统一 ReaderCanvas

- 泛化 resize hook；
- 默认 Split 与 Source/Analysis 两种 focus mode；
- 保存 per-session scroll 与 pane 比例。

### Slice 3：Analysis route 与返回路径

- Close Reading 为 Analysis root；
- Explain/Vocabulary/Translation/Note 为 anchor detail；
- 恢复 Close Reading revision 与 scroll。

### Slice 4：History 重新组织，名称不变

- 保留 History label；
- 增加 Overview / Source order / Recent；
- deep link 和精确 source reveal。

### Slice 5：Session switch 与容量响应

- session URL；
- per-session snapshot；
- container capacity；
- mobile/drawer journey。

### Slice 6：基于证据的依赖与性能优化

- 评估是否采用 resizable panels、floating positioning 或 virtualization；
- 没有性能或维护证据就不增加依赖。

## 实施前决策门

在开始产品代码改动前，应先确认：

1. **已确认**：桌面端默认双栏；`Source / Split / Analysis` 降级为紧凑 layout control，History 保持独立入口；
2. **建议确认**：从 History 返回时恢复原 layout；
3. **待确认**：Vocabulary/短 Translation 是临时小结果还是立即进入 Analysis pane；
4. **当前建议**：pane ratio 和 scroll 按 session、按设备本地保存，不做跨设备同步；
5. **待确认**：Close Reading revisions 首版是否接受客户端按 document anchor 分组。

只有这些行为被低保真原型确认后，才进入 Slice 1。这样可以避免先换组件或引入 library，最后才发现产品层级仍需重做。

## 参考

- [Apple Human Interface Guidelines: Split Views](https://developer.apple.com/design/human-interface-guidelines/split-views)
- [React: Managing State](https://react.dev/learn/managing-state)
- [Tailwind CSS: Responsive Design and Container Queries](https://tailwindcss.com/docs/responsive-design)
- [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)
- [TanStack Virtual](https://tanstack.com/virtual/latest/docs/introduction)
- [OpenAI: Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/)
- [Anthropic: Redesigning Claude Code on desktop](https://claude.com/blog/claude-code-desktop-redesign)
- [VS Code: Sessions and handoff](https://code.visualstudio.com/docs/agents/concepts/sessions)
- [Readwise Reader: Highlights, Tags, and Notes](https://docs.readwise.io/reader/docs/faqs/highlights-tags-notes)
- [Hypothesis: Annotation Basics](https://web.hypothes.is/help/annotation-basics/)
