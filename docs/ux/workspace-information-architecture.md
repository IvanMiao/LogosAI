# Workspace 信息架构重构提案

- 状态：Exploration，等待产品确认后再进入实现
- 日期：2026-08-23
- 分支：`codex/uiux-information-architecture`
- 目标用户：在桌面端阅读长文本、反复回看选区与解释的深度阅读者
- 交付物：信息架构诊断、低保真布局、状态模型、分阶段实施与可用性验证计划
- 设计阶段：低保真探索；本文不修改现有 UX contract

## 结论

当前问题不是侧栏“样式太满”，而是四种不同尺度的对象被放进同一个 `ContextPanel`：

1. 跨文档导航：reading sessions；
2. 当前文档集合：saved marks、notes、session outputs；
3. 当前选区操作：Explain、Translate、Vocab、Write note、Delete；
4. 长内容阅读：Explanation、Translation、Vocabulary、Close Reading。

这些对象拥有不同的作用域、生命周期和空间需求。继续通过排序、accordion 或更多菜单压缩它们，
只会隐藏复杂度，不会消除复杂度。

建议建立四个明确表面，并禁止职责交叉：

| 表面 | 唯一职责 | 不应包含 |
| --- | --- | --- |
| **Sessions** | 在文档之间新建、查找、切换、重命名和删除 | 当前文档的 mark/output 子树、AI 操作、长内容 |
| **Reader** | 阅读原文并保留 source-linked 标记 | session 搜索、output 全文、批量筛选器 |
| **Notebook** | 浏览当前文档的 marks、notes 与 outputs 集合 | 跨文档管理、即时 AI 操作 |
| **Selection inspector** | 操作当前选区，编辑该选区的 note | session-wide 列表、历史全文、无选区时的 dashboard |

所有 AI 长内容都进入独立、可阅读的 **Insight pane**，不再按 artifact 类型决定空间待遇。
Close Reading、Explanation、Translation 与 Vocabulary 都应获得足够宽度、统一的返回原文路径和
一致的历史切换行为。

## 为什么现有结构失败

### 1. 作用域混杂

`ContextPanel.tsx` 当前同时渲染文档摘要、整篇 Close Read、Saved marks 搜索与筛选、Session outputs
搜索与筛选、选区 destructive actions、note editor、artifact history、task controls 和 artifact 正文。
“Context” 因而无法回答一个最基本的问题：这里显示的是文档、session、选区，还是结果？

### 2. 优先级倒置

用户刚触发 Explain 时，最重要的是答案和回到原文的位置；现有顺序却可能先展示：

```text
选区引文
→ Saved marks 搜索 / 筛选 / 列表
→ Session outputs
→ Note editor
→ 当前 artifact
```

当 saved marks 增长时，用户主动请求的内容会落到首屏之外。把 artifact 移到列表上方只能修复顺序，
不能修复“集合导航、对象操作、长内容阅读共用 380px”的根因。

### 3. 尺度不匹配

在 1280×720 的当前主线实测中，空 session 已经让 Saved marks 搜索框位于面板中下部，筛选器和空态
接近视口底部；Session outputs 需要继续滚动。面板宽度固定为 380px，而长篇 Markdown、词汇列表和
多条历史记录需要的是稳定阅读宽度或 list-detail 布局。

### 4. 状态与入口不一致

本地测试创建三条 paragraph Close Reading 后，工具栏的 “Open context panel” 会重新打开 Close
Reading pane，而不是 session index。一个入口根据残留的 active artifact 改变目的，用户无法预测
它会打开“Context”还是“Close Reading”。这不是文案问题，而是 panel state 将导航状态、选区状态和
阅读状态绑在了一起。

### 5. 原生折叠并没有建立信息架构

`SessionOutputIndex` 使用 `<details>` 默认折叠，但它仍然属于 Context Panel 的滚动与 tab order，
Saved marks 仍默认展开。折叠只减少初始高度，没有解释两个 collection 为什么属于当前选区的 context。

## 外部模式与适用结论

本提案参考的是结构原则，不复制任何产品的视觉风格。

### Apple HIG：Sidebar 是同级区域导航，不是万能容器

[Apple Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) 将 sidebar 定义为
应用同级区域或模式的宽而平的信息层级，并建议一般不超过两层；更深层级应使用包含中间内容列表的
split view。2025-06-09 的更新还强调 sidebar 与内容层的分离。

**用于 LogosAI：** Sessions 可保持平坦；session 的 marks/outputs 不继续嵌套在其下。Notebook 使用
list-detail，而不是在 380px sidebar 内形成第三层。关键操作不放在可能被窗口底部裁掉的位置。

### VS Code 2026：Container、View、Item 和 Action 必须分层

[VS Code Views](https://code.visualstudio.com/api/ux-guidelines/views) 与
[Sidebars](https://code.visualstudio.com/api/ux-guidelines/sidebars) 建议最小化 View 数量、不要把 tree item
当作单一 command、每个 item 不超过三个 actions，并指出 3–5 个 Views 已是多数屏幕的舒适上限。
[Panel](https://code.visualstudio.com/api/ux-guidelines/panel) 则用于需要更多横向空间的支持性内容。

**用于 LogosAI：** mark 是导航对象，不应同时暴露 delete、AI actions 和全文；二级操作进入对象菜单。
长 output 进入 Insight pane；Notebook 是 collection view，不与 Selection inspector 叠加。

### Atlassian：Navigation、Main content 与 Contextual panel 是不同布局区域

[Atlassian Layout](https://atlassian.design/components/navigation-system/layout) 将 navigation 与 content
定义为独立区域；[Panel](https://atlassian.design/components/panel/usage) 明确用于主内容旁的 contextual
information。旧 Side navigation 已被新 Navigation system 取代，旧 Drawer 也进入弃用路径。

**用于 LogosAI：** 不再继续投资“所有东西都放 drawer/sidebar”的路径。Notebook 应进入 main
content 或明确的 list-detail workspace；Selection inspector 只呈现当前对象。

### Progressive disclosure：延后次要功能，但保持主路径完整

[Microsoft progressive disclosure guidance](https://learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-progressive-disclosure-controls)
建议只在相关上下文中显示 detail 与 commands，并降低 secondary affordance 的视觉重量。

**用于 LogosAI：** 删除、历史版本和重试属于对象级次要操作；默认界面只保留当前任务所需操作。
Notebook 的搜索和筛选仅在用户进入 Notebook 后出现，不能挡在刚生成的答案之前。

### Material 3 Expressive 2026：采用适配思想，不采用装饰趋势

[Material 3](https://m3.material.io/) 在 2026 更新中强调 adaptive components 与 flexible toolbars。
本项目可借用“根据容器变化而适配”的原则，但不应借机改色彩、字体或引入装饰性 motion；本轮目标是
结构清晰和阅读连续性，不是视觉换肤。

## 目标信息架构

```text
Workspace
├── Sessions                         跨文档
│   ├── Search
│   ├── New session
│   └── Session rows                 title / source / last opened / counts
├── Reader                           当前文档
│   ├── Source text
│   ├── Persistent source marks
│   └── Selection actions            transient, anchored to selection
├── Notebook                         当前文档集合
│   ├── Marks
│   ├── Notes
│   └── Outputs
├── Selection inspector              当前选区
│   ├── Quote + show source
│   ├── Explain / Translate / Vocab
│   ├── Note
│   └── More: delete
└── Insight pane                     当前长内容
    ├── Active artifact
    ├── Revisions
    ├── Copy / retry / delete
    └── Back to source / focus
```

### 对象归属规则

| 对象 | 主归属 | 打开后的目标 |
| --- | --- | --- |
| Document/session | Sessions | Reader |
| Anchor/mark | Notebook | Reader + Selection inspector |
| Note | Notebook | Selection inspector 的 note read/edit state |
| AI artifact | Notebook | Reader + Insight pane |
| AI command | Selection inspector 或 selection toolbar | Insight pane |

## 低保真布局

### Reader：没有 active selection

```text
┌ Sessions ───────────── Document title ───────── Notebook ─ Settings ┐
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         Source text                                 │
│                   persistent, quiet marks                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

默认不显示空 Context dashboard。整篇 Close Read 属于 Reader toolbar 的文档级 command。

### Reader：active selection

```text
┌───────────────────────────────────────────────┬─────────────────────┐
│ Source text                                   │ Selection           │
│ selected range remains visibly marked         │ quote               │
│                                               │ Explain  Translate  │
│                                               │ Vocab    Note       │
│                                               │ More…               │
└───────────────────────────────────────────────┴─────────────────────┘
```

Selection inspector 不出现 session-wide search、filters 或历史全文。

### Reader：active artifact

```text
┌──────────────────────────────┬──────────────────────────────────────┐
│ Source text                  │ Insight                              │
│ active source highlighted    │ readable 55–70ch body                │
│                              │ history / copy / retry in toolbar    │
│                              │ Show source / Focus / Close          │
└──────────────────────────────┴──────────────────────────────────────┘
```

所有 artifact 类型使用同一空间规则；Vocabulary 可以在 Insight 内使用适合列表的 variant。

### Notebook：list-detail

```text
┌ Notebook ─ Search ─ Type filter ────────────────────────────────────┐
├───────────────────────┬─────────────────────────────────────────────┤
│ Marks / Notes / Output│ Selected source                            │
│                       │ attached note and outputs                   │
│ stable list rows      │ Open beside source                         │
└───────────────────────┴─────────────────────────────────────────────┘
```

Notebook 是当前 session 的 peer mode，不嵌套在 Sessions 之下。

### Mobile

- Reader 保持单列；选区动作使用轻量 bottom sheet，并保留明确关闭入口。
- Notebook 使用全屏 list → detail drill-down，不在 390px 内并排两列。
- Insight 使用全屏阅读，顶栏固定 `Back to text`。
- 不把 desktop sidebar 简单压缩成 mobile drawer。

## 状态模型

面板状态应由明确的互斥 union 表达，而不是由多个 boolean 与残留 artifact ID 推导：

```ts
type WorkspaceSurface =
  | { kind: 'reader' }
  | { kind: 'selection'; anchorId: string }
  | { kind: 'insight'; anchorId: string; artifactId: string; focused: boolean }
  | { kind: 'notebook'; itemId?: string };
```

关键不变量：

1. 工具栏 `Notebook` 永远打开 Notebook；不受 active artifact 影响。
2. `Show source` 永远回到 Reader，并高亮对应 range。
3. 执行 AI command 永远进入 Insight；不先显示 session collection。
4. 关闭 Insight 回到其来源：Reader 或 Notebook；不得隐式切换 artifact。
5. Sessions 切换文档后进入 Reader；不继承上一文档的 inspector/pane 状态。

## 实施切片

### Slice 1：建立职责边界

- 从 `ContextPanel` 移除 `SelectionIndex` 和 `SessionOutputIndex`。
- 将无 active selection 的 Context dashboard 删除；整篇 Close Read 放回 document-level command。
- 将 `ContextPanel` 重命名为面向对象的 `SelectionInspector`。
- 用 discriminated union 替代 panel booleans 与 artifact ID 的组合推导。

### Slice 2：统一长内容表面

- 将当前 `CloseReadingPane` 泛化为 `InsightPane`。
- Explanation、Translation、Vocabulary 和 Close Reading 共享 resizable split、focus、copy、history 与
  source reveal。
- artifact-specific renderer 只负责内容形态，不改变容器层级。

### Slice 3：建立 Notebook

- 复用现有 Saved marks 与 Session outputs 的过滤逻辑，改为 main-area list-detail。
- 增加明确的 `Notebook` toolbar 入口与 active state。
- 保留当前 WJ-13 的“跨 selection 查找 output”能力，但把入口从 Context 移到 Notebook。

### Slice 4：强化 source linkage

- 在原文保留安静、持久的 inline anchor 标记。
- Notebook/Insight 的 `Show source` 统一滚动并高亮精确 range。
- 移动端提供等价返回路径。

每个 slice 单独 PR，不同时做视觉换肤、数据模型重写或依赖升级。

## 需要修改的 UX contract

进入实现时应显式更新 `workspace-journey-contract.md`：

- 不变量 3 改为 Selection inspector 只显示一个 active source；artifact 全文由 Insight pane 承担。
- 不变量 13 / WJ-13 的 session-wide output index 从 Context Panel 移到 Notebook。
- WJ-02、WJ-03、WJ-05 的入口从 “Open Context Panel” 拆成 Selection / Insight 的明确入口。
- 新增：Notebook 按钮目的不随 active artifact 改变。
- 新增：AI action 后 artifact 标题与正文在无需纵向滚动的情况下可见。

## 可用性验证计划

先用 5–8 名目标读者测试低保真 prototype，再合并完整实现。

| 任务 | 成功标准 | 时间目标 |
| --- | --- | --- |
| 切换到一篇较早文档 | 不进入 mark/output 子层级 | 15 秒内 |
| 找到当前文档另一选区的旧解释 | 首次选择正确表面 ≥ 90% | 20 秒内 |
| 选中文本并请求 Explain | artifact 标题与正文无需面板内长滚动即可看到 | 20 秒内看到明确状态 |
| 从解释回到精确原文 | 一次明确操作完成 | 5 秒内 |
| 找到并编辑自己的 note | 不把 note 误判为未保存 draft | 20 秒内 |

记录 task completion、time on task、错误打开的表面数、backtrack 次数和 SUS；SUS 目标至少 68。
任何任务中若超过 20% 用户把 Sessions 当成 session 内对象浏览器，说明 IA 仍未成立。

## QA 环境记录

### 线上注册流程

- 日期：2026-08-23
- 地址：`https://logosai-cloud.ymiao.workers.dev`
- 测试账号：`codex-uiux-20260823@logosai.test`
- 结果：email/password 注册成功，自动建立 session 并跳转 `/app`
- 测试数据：创建一篇无个人信息的英文阅读 session
- 密码：**有意不写入仓库或 Git 历史**

### 当前主线本地验证

- 地址：`http://127.0.0.1:8787`
- 数据库：Wrangler local D1，gitignored
- 测试账号：与线上测试邮箱相同，仅存在于本地 D1
- 测试 session：`UI architecture pressure test`
- viewport：1280×720
- 结果：注册成功；空 Context 已出现职责混杂和首屏裁切；三条 paragraph Close Reading 后，
  Context toolbar 入口受 active artifact 影响而重新打开 Close Reading pane
- 密码：**有意不写入仓库或 Git 历史**

## 本轮明确不做

- 不复用已关闭 PR 29 的大范围修补实现。
- 不用更多 accordion、tabs 或图标继续压缩现有 ContextPanel。
- 不改变颜色、字体、brutalist 视觉语言或引入新依赖。
- 不在没有 prototype 测试前一次性实现四个 slice。

