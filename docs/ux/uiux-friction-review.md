# UI/UX 摩擦评审：Workspace Alpha

- 状态：Review，仅为分析与建议，不构成实施授权
- 评审日期：2026-08-21
- 评审对象：`frontend/` 当前 `main`（`ccc4767`）
- 参考基准：[PROJECT.md](../PROJECT.md)、[ROADMAP.md](../ROADMAP.md)、[Workspace Journey UX Contract](workspace-journey-contract.md)

本文档从产品与用户体验角度记录当前实现中的摩擦点。它不修改任何代码，也不改变现有 UX
contract。每条结论都给出可核对的代码位置，并说明为什么它是产品问题，而不只是界面缺陷。

评审基准取自项目自己的定义，而不是通用可用性清单：

- 候选核心任务：「不离开当前文本理解一个困难片段，然后继续阅读；需要时，保存可重新找到的解释或个人笔记。」
- 候选 north-star outcome：`resolved reading friction`——获得 source-grounded help 后能够继续阅读。
- ROADMAP 已命名的基线指标：import/BYOK 完成率、time to first useful artifact、**source passage 可定位率**、action 后继续阅读、第二篇文档/第二次 session。

## 结论摘要

**最大的摩擦不在任何单个控件上，而在于「source-grounded」这一核心承诺目前只在数据层成立，没有在阅读界面上兑现。**

Artifact 在数据结构上严格挂在 anchor 上，anchor 保存 exact quote 与 offset，测试也保护了
source 归属不串。但在用户看到的阅读界面里，**被选中的 passage 在原文中不留下任何持久痕迹**。
原文段落只是纯文本渲染（`ReadingSurface.tsx:291-296`），没有任何 inline 标记；已保存的
selection 只表现为左侧栏一个 16px 的色块，且仅在 ≥1024px 出现（`ReadingSurface.tsx:270-289`）。
输出与原文的关联被降级为「在侧栏里再打印一遍引文」（`ContextPanel.tsx:306`，`line-clamp-3`）。

其后果直接落在项目自己的指标上：`source passage 可定位率`依赖用户能把答案对回原文的某几个字，
而当前界面要求用户凭一段截断的引文在全文里自己重新找位置。同时，`继续阅读`这一 north-star
行为缺少最关键的支点——读者读完解释后，看不到「我刚才卡住的是这里」。

其余摩擦按对核心命题的威胁程度排序如下。P0 三项会直接污染 Gate 1 的用户验证结果；P1 四项影响
信任与重复使用（Gate 2）；P2 为打磨项。

| 级别 | 摩擦 | 影响的指标 |
| --- | --- | --- |
| P0-1 | 原文中没有持久的 passage 标记 | source passage 可定位率、继续阅读 |
| P0-2 | BYOK 是事后才报错的隐形门槛 | import/BYOK 完成率、time to first useful artifact |
| P0-3 | 首 token 之前没有过程反馈，后端已有的 stage 被丢弃 | time to first useful artifact、中断流的可解释性 |
| P1-1 | 云同步只有图标状态，最能安抚用户的错误文案是死代码 | 信任、第二次 session |
| P1-2 | Note 永远停留在 `draft`，没有「写完」这一步 | 笔记作为第一等内容、重复使用 |
| P1-3 | 数据模型词汇直接泄漏到界面 | 可理解性、用户对失败状态的判断 |
| P1-4 | 平板 1024–1279px 存在分屏空洞 | 设备覆盖、可用性测试有效性 |
| P2 | 导入错误不可见、技能语义不可区分、选择工具条定位与触屏可靠性、流式输出无 live region、遗留入口双 chrome | 打磨与可访问性 |

---

## P0-1 原文中没有持久的 passage 标记

### 现象

读者选中一段文字并触发 Explain 之后，浏览器原生高亮一旦消失，原文里就再也看不出刚才问的是哪几个字。

### 证据

段落是纯文本渲染，没有为 anchor range 做任何 span 切分：

```291:296:frontend/pages/workspace/components/ReadingSurface.tsx
              <p
                data-paragraph-start={paragraph.startOffset}
                className="mb-7 whitespace-pre-wrap"
              >
                {paragraph.text}
              </p>
```

唯一的原文侧视觉线索是段落级、且是**瞬时**的：`data-active-source` 标在整个段落上，高亮在
1800ms 后自动消失，并且只在 `sourceRevealRequest` 变化时触发。

```264:268:frontend/pages/workspace/components/ReadingSurface.tsx
              data-active-source={isActiveSource ? 'true' : undefined}
              className={cn(
                'group grid scroll-mt-36 grid-cols-1 border-l-4 border-l-transparent px-3 transition-colors duration-300 lg:grid-cols-[1.5rem_minmax(0,1fr)] lg:gap-3',
                isRevealedSource ? 'border-l-secondary bg-secondary/10' : '',
              )}
```

```198:202:frontend/pages/workspace/components/ReadingSurface.tsx
    const highlightTimer = window.setTimeout(() => {
      setRevealedAnchorId((currentAnchorId) => (
        currentAnchorId === anchorId ? null : currentAnchorId
      ));
    }, 1800);
```

已保存的 selection 只表现为左栏 16px 色块，颜色区分的是 `active/draft/saved` 状态而不是内容，
tooltip 也不显示引文；整列在 `lg` 以下完全隐藏：

```270:289:frontend/pages/workspace/components/ReadingSurface.tsx
              <div className="hidden flex-col items-center gap-2 pt-1 lg:flex">
```

```83:84:frontend/pages/workspace/components/ReadingSurface.tsx
      aria-label={`Open ${status} selection`}
      title={`${status} selection`}
```

补偿机制是在侧栏复制引文，且截断为三行：

```306:306:frontend/pages/workspace/components/ContextPanel.tsx
          <p className="mt-2 line-clamp-3 font-sans text-sm leading-6">{activeAnchor.quote}</p>
```

### 为什么这是产品问题

1. **它把「回到原文」变成一次搜索任务。** 核心任务的后半句是「继续阅读」。读者读完解释需要回到
   原文的那一行接着读；现在他必须先用侧栏里截断的引文，在全文中自己重新定位。
2. **它使 `source passage 可定位率` 无法真正提升。** 这个指标衡量的是用户能否把答案对回原文。
   数据层已经有精确 offset，但界面没有把这份精度暴露给用户，指标的上限被 UI 卡住。
3. **它削弱了与通用聊天工具的差异化。** H7 要验证「Close Read 比普通聊天或翻译更有差异化」。
   如果输出与原文的关联在视觉上只是「上面引了一段话」，那和把段落粘进聊天框的体验几乎一样，
   差异化论证失去最直观的证据。
4. **多个 anchor 时召回能力接近于零。** 同一段落里的多个 anchor 在左栏堆成一列外观相同的色块
   （`ReadingSurface.tsx:282-289`），无法据此判断哪个是哪个。

### 改进方向

- 让 anchor range 在原文中获得**持久且低调**的 inline 标记（例如下划线或极浅底色），
  active anchor 加强一档。这与 PROJECT.md 的视觉不变量第 9 条并不冲突：标记属于「active object」，
  而且应当保持安静，不使用 chrome 的硬边框与硬阴影。
- 段落级瞬时高亮保留为「定位动画」，但不应替代持久标记；1800ms 后消失的是动画，不是关联。
- 左栏色块承载的是「状态」而不是「内容」。真正需要的是 hover/focus 时能看到引文，
  以及在窄屏上有等价入口——目前 `lg` 以下完全没有从原文侧回到已保存 selection 的路径。
- 反向关联同样缺失：从 output 应能一键点亮原文对应位置。`sourceRevealRequest` 已具备这个能力，
  但当前只服务于 Close Reading pane 的「Show source」，没有普及到 Explain/Translate/Vocab。

---

## P0-2 BYOK 是事后才报错的隐形门槛

### 现象

新用户注册后直接进入导入界面。没有任何步骤告知必须自备 Gemini API key。用户导入文本、选中段落、
点击 Explain，然后才收到一条失败 artifact。

### 证据

缺 key 时不阻止操作，而是先创建一个失败 artifact：

```291:298:frontend/pages/workspace/useWorkspace.ts
    if (!hasApiKey) {
      failCloseReadBeforeRequest(
        anchor,
        title,
        'Missing Gemini API key. Configure it in Settings.',
      );
      return;
    }
```

同样的分支存在于 anchor skill 路径（`useWorkspace.ts:330-338`）。这条文案说「Configure it in
Settings」，但渲染它的错误块里没有通往 Settings 的链接（`ArtifactDisplay.tsx:57-81`）。

行动前唯一的提示是 header 里一个图标按钮，状态只通过底色与 tooltip 传达：

```46:49:frontend/pages/workspace/components/WorkspaceHeader.tsx
  const apiKeyClassName = cn(
    'h-11 w-11',
    viewModel.apiKeyStatusTone === 'ready' ? 'bg-secondary' : 'bg-accent',
  );
```

值得注意的是，**同一个 `bg-accent` 黄色也用于云同步失败按钮**（`WorkspaceHeader.tsx:149`）。
header 里因此可能出现两个相邻的黄色图标按钮，分别代表两件完全不同的事，只能靠 glyph 和 tooltip 区分。

反差在于：被标记为 legacy 的分析页反而做得更好，它在操作前给出带链接的横幅
（`AnalysisPanel.tsx:68-74`），并禁用提交按钮。主线阅读流程没有这个保护。

这个反应式行为是**被测试固定的契约**，不是偶然实现：

```236:236:frontend/tests/workspace/workspaceHardening.test.tsx
    expect(screen.getByText('Missing Gemini API key. Configure it in Settings.')).toBeInTheDocument();
```

### 为什么这是产品问题

1. **它把最高的流失点放在了用户已经投入之后。** 用户先付出「找一篇真实文本并粘贴进来」的成本，
   才发现还需要去 Google AI Studio 申请 key。这正是 H2（用户愿意把真实文本带入）与
   H6（BYOK 可接受）交叉的地方，而当前顺序让两个假设的失败原因无法区分：用户放弃时，
   我们不知道他是不接受 BYOK，还是不接受「投入之后才被告知」。
2. **它会污染 Discover 0 的观察结论。** ROADMAP 要求「单独测试 paste/file import 与 Gemini BYOK」。
   当前实现把两者耦合在同一次失败里，无法单独测量任一环节的完成率。
3. **Gate 1 明确要求「BYOK/import 不阻断核心用户」。** 以当前形态，第一次 AI 操作的
   预期结果对无 key 用户是 100% 失败。
4. **失败被表达为一个「产出物」。** 用户得到的是一条挂在 anchor 上、状态为 `failed` 的 artifact，
   即把配置问题混进了阅读成果的历史记录里。

### 改进方向

- 把 key 状态变成阅读前的一次性、可关闭的引导，而不是 header 角落的图标；文案需说明为什么需要
  自备 key（Worker 加密存储、FastAPI 不保存），这本身是信任资产而不只是障碍。
- 错误文案既然指向 Settings，就应当直接提供跳转。
- 无 key 时，选择工具条上的 AI 动作应表达为「需要先配置」，而不是允许点击后产生失败 artifact。
  Note 不需要 key，应保持可用——这也顺带让「笔记是第一等内容」在无 key 状态下真正成立。
- 若要改变这一行为，需同步更新 `workspaceHardening.test.tsx` 与本目录的 UX contract。
- Header 中不应让两种不同故障共用同一种底色。

---

## P0-3 首 token 之前没有过程反馈，后端已有的 stage 被丢弃

### 现象

触发 Close Read 或 Explain 后，界面只显示一个旋转图标和一行「Reading closely…」。在真正开始
出字之前，用户无法判断系统是在工作、卡住，还是已经失败。

### 证据

后端流水线会显式发出三个阶段事件：

```64:102:backend/llm/agent.py
        yield {"event": "stage", "stage": "detect"}
...
            yield {"event": "stage", "stage": "correct"}
...
        yield {"event": "stage", "stage": "interpret"}
```

Workspace 两条 AI 路径都把它们丢掉：

```312:315:frontend/pages/workspace/useWorkspace.ts
          {
            onChunk,
            onStage: () => undefined,
          },
```

```356:360:frontend/pages/workspace/useWorkspace.ts
          {
            onChunk,
            onStage: () => undefined,
            onMetadata,
          },
```

而 legacy 分析页早已把同样的事件映射成人类可读文案：

```12:13:frontend/components/AnalysisPanel.tsx
  detect: 'Detecting language and genre...',
  correct: 'Correcting source text...',
```

空内容时的占位文案还会在非运行态显示成 `Draft started.`：

```113:115:frontend/pages/workspace/components/ArtifactDisplay.tsx
        <p className="text-sm leading-6 text-muted-foreground">
          {artifact.status === 'running' ? 'Reading closely…' : 'Draft started.'}
        </p>
```

### 为什么这是产品问题

1. **静默窗口恰好是最长的那一段。** 按 PROJECT.md 的描述，流程是 Flash Lite 检测语言/体裁 →
   可选纠错 → 主模型生成讲解。也就是说在用户看到第一个字之前，可能已经发生了一到两次完整的
   模型调用。这是感知等待最长、也最容易被误判为「坏了」的阶段，而它正好没有任何信息。
2. **信息已经在管道里，只差没有接线。** 这不是需要新建能力，而是主线流程丢掉了 legacy 流程
   已经用上的数据。
3. **它直接压低 `time to first useful artifact` 的主观表现，并干扰 Discover 1。** Discover 1 要求
   至少覆盖「missing key、低质量回答或中断 stream」中的一种失败。若用户无法区分「还在检测」与
   「流已中断」，中断流的观察数据就不可靠。
4. **`Draft started.` 是错误的心理模型。** 对一次 AI 任务而言，「草稿已开始」既不描述状态，
   也不提示下一步；它更像是 note 语义漏进了 AI artifact 的占位文案。

### 改进方向

- 接回 `onStage`，把 detect/correct/interpret 表达为读者语言（例如「正在判断语言与体裁」
  「正在通读上下文」），保持局部显示、不阻塞阅读（视觉不变量第 6 条）。
- `correct` 阶段尤其值得显式说明：用户不会预期系统在纠正原文，静默执行反而是信任风险。
- 区分「排队/准备」与「正在生成」两种等待，避免用同一个 spinner 覆盖数秒到数十秒的跨度。
- 空态文案应按 artifact 类型分化，不要让 AI 任务复用 note 的措辞。

---

## P1-1 云同步只有图标状态，最能安抚用户的文案是死代码

### 现象

用户无法知道自己的笔记是否已经进入云端。同步状态是 header 里一个 44px 的图标，文字只存在于
tooltip 与 aria-label。同步失败时，最重要的一句话——「你的改动仍然保存在本机」——从未显示。

### 证据

状态文案齐全，但只作为 label 传给图标：

```55:61:frontend/pages/workspace/useWorkspace.ts
  const syncLabelByStatus: Record<WorkspaceSyncStatus, string> = {
    loading: 'Loading cloud workspace',
    saving: 'Saving to cloud',
    saved: 'Saved to cloud',
    offline: 'Cloud sync offline. Select to retry.',
    error: 'Cloud sync failed. Select to retry.',
  };
```

```159:170:frontend/pages/workspace/components/WorkspaceHeader.tsx
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center border-2 border-border bg-card"
    >
      {tone === 'saved'
        ? <Check className="h-4 w-4" aria-hidden="true" />
        : <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
    </span>
  );
```

同步 hook 里写好了更具体、更安抚的文案：

```146:146:frontend/pages/workspace/useWorkspaceCloudSync.ts
        setError('Cloud sync is offline. Your changes remain saved on this device.');
```

但 `useWorkspace` 只消费了 `status` 与 `retry`，`error` 从未被读取，因此这两条文案是死代码：

```188:196:frontend/pages/workspace/useWorkspace.ts
  const cloudSync = useWorkspaceCloudSync({
    enabled: props.cloudSyncEnabled ?? false,
```

```549:549:frontend/pages/workspace/useWorkspace.ts
    retryCloudSync: cloudSync.retry,
```

对照之下，localStorage 写入失败**有**醒目横幅（`WorkspacePage.tsx:139-142`）。也就是说本地
失败可见，云端失败几乎不可见——与两者的实际风险顺序相反。

### 为什么这是产品问题

1. **它把信任判断交给了 tooltip。** 用户刚写完一段私人笔记，最想确认的就是「存住了吗」。
   需要 hover 才能读到的状态，等于没有回答这个问题。
2. **它与 Gate 2 的目标冲突。** Gate 2 要观察「第二次 session、重开 artifact/note」。
   如果用户对持久性没有信心，他不会把真实笔记写进来，重复使用的证据就无法自然产生。
3. **失败态与配置态视觉同色。** 前述 `bg-accent` 复用问题在这里再次出现。
4. **多设备冲突完全静默。** `chooseNewerSession` 以时间戳取胜（`reading-cloud-state.ts:74-79`），
   界面从不提示曾发生覆盖或远端删除。ROADMAP 已承认 last-writer-wins 是当前边界，
   但「边界」与「用户不知情」是两件事。

### 改进方向

- 把「仅保存在本机」升级为持续可见的状态，而不是 tooltip；至少在离线/失败态显示既有的
  安抚文案，让用户知道数据没丢。
- 让 `cloudSync.error` 真正到达界面，或删除它——保留一段永不显示的用户文案本身就是维护陷阱。
- 明确区分三种语义：本地已写入、云端已确认、云端未确认。当前只有「转圈」与「对勾」。
- 现在的 retry 只重跑推送、不重新拉取；在无待推送变更时会直接置为 `saved`
  （`useWorkspaceCloudSync.ts:202-204`），这可能在初次加载失败后显示为「已保存到云端」。
  这是一个应当避免的 false saved state，ROADMAP 的 Delivery 3 已把「Storage 写入失败可见，
  不显示 false saved state」列为目标。

---

## P1-2 Note 永远停留在 `draft`，没有「写完」这一步

### 现象

笔记没有保存按钮，也没有完成状态。每次击键即写入本地，但状态永远是 `draft`，编辑器也无法收起。

### 证据

`upsertNoteDraft` 无条件写入 `status: 'draft'`，没有任何路径把 note 置为 `complete`：

```71:71:frontend/features/artifacts/artifact-core.ts
      status: 'draft',
```

```40:42:frontend/features/artifacts/artifact-core.ts
function isNoteDraft(artifact: Artifact): artifact is NoteArtifact {
  return artifact.type === 'note' && artifact.status === 'draft';
}
```

只要笔记有内容，编辑器就会在该 anchor 激活时强制展开，没有「完成」或「收起」控件：

```119:120:frontend/pages/workspace/components/ReaderWorkspace.tsx
  const isNoteEditorOpen = reading.activeAnchor?.id === noteEditorAnchorId
    || reading.noteDraftContent.length > 0;
```

而 `draft` 这个词会原样出现在会话输出索引与历史菜单中（`SessionOutputIndex.tsx:107`、
`ContextPanel.tsx:433`）。

### 为什么这是产品问题

1. **它与「用户笔记是第一等内容，不是 AI history 的附属品」直接矛盾。** 在界面上，AI 输出可以
   `complete`，用户笔记永远 `draft`——两类内容的地位在状态语义上并不对等。
2. **`draft` 在用户语境里意味着「未保存」。** 实际上它已经持久化并同步。这个标签制造的是
   不必要的不安，恰好作用在最私人的内容上。
3. **编辑器无法收起，破坏了阅读节奏。** 写过笔记的 anchor 每次激活都会弹出 textarea 并
   `autoFocus`（`ContextPanel.tsx:529-534`），把焦点从阅读夺走。
4. **它妨碍 Gate 3 的观察。** Gate 3 要找「跨 session 行为比一次性 Explain 增加价值」。
   笔记是最可能产生这种价值的对象，但「重读自己的笔记」目前不是一个被设计过的动作——
   笔记只有编辑态，没有阅读态。

### 改进方向

- 为 note 引入明确的完成语义与收起动作，让它有「阅读态」，而不只有「编辑态」。
- 状态词面向用户表达（例如「已保存」而非 `draft`）。
- 考虑让笔记与 AI 输出在 Context Panel 中拥有对等的展示位置。

---

## P1-3 数据模型词汇直接泄漏到界面

### 现象

内部枚举与工程术语直接呈现给用户。

### 证据

artifact 状态原样渲染：

```130:130:frontend/pages/workspace/components/ArtifactDisplay.tsx
      <span className="text-xs font-bold text-muted-foreground">{artifact.status}</span>
```

同样的原始枚举出现在 `SessionOutputIndex.tsx:107`、`ContextPanel.tsx:433`、
`CloseReadingActions.tsx:116`。

anchor scope 原样渲染为小写 `selection` / `paragraph` / `document`，尽管同一文件里已有
面向用户的映射函数 `getAnchorGroupLabel`（`ContextPanel.tsx:135-137`）：

```303:305:frontend/pages/workspace/components/ContextPanel.tsx
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            {activeAnchor.scope}
          </p>
```

无障碍名称同样暴露内部状态词（`ReadingSurface.tsx:83-84`，读作 `active`/`draft`/`saved`），
控件名称使用领域内部名词（`ArtifactDisplay.tsx:136,147`：`Stop artifact`、`Retry artifact`；
`:76`：`Copy trace`）。

此外，PROJECT.md 明确规定「用户界面不显示 anchor 一词」——这一条被遵守了；但 `artifact`、
`trace`、`scope`、`status` 枚举并未受到同等约束。

### 为什么这是产品问题

1. **用户需要用状态判断「要不要重试」。** `stopped` 与 `failed` 的差别对用户有实际含义
   （一个是我停的，一个是它坏了），但原始枚举既不解释也不建议下一步。
2. **它把领域模型的整洁误当成界面的整洁。** 代码里统一叫 artifact 是好设计；让读者也读到
   artifact，则是把内部一致性成本转移给了用户。
3. **它使可用性测试更难解读。** 参与者卡在 `draft` 这类词上时，产生的是词汇困惑，
   会掩盖真正的流程问题。

### 改进方向

- 在展示层建立状态与 scope 的文案映射（项目已有 `getAnchorGroupLabel`、
  `getSourceScopeLabel` 这类先例，只是没有覆盖全部出口）。
- 状态文案应带下一步暗示，而不只是名词。
- 控件的 accessible name 使用读者语言（例如「停止生成」而非 `Stop artifact`）。

---

## P1-4 平板 1024–1279px 存在分屏空洞

### 现象

在 1024–1279px 宽度下，打开 Close Reading 会完全盖住原文：既没有并排布局，也没有拖拽分隔条，
也没有全屏 focus 按钮。用户只能用「Back to text」在两个视图之间来回切换。

### 证据

JS 侧的桌面判定阈值是 1024px：

```3:3:frontend/pages/workspace/useWorkspaceViewport.ts
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
```

但分屏布局、原文面板与分隔条全部要求 `xl`（1280px）：

```23:27:frontend/pages/workspace/components/CloseReadingSplitLayout.tsx
      className="mx-auto grid max-w-[1600px] grid-cols-1 xl:grid-cols-[minmax(380px,var(--close-reading-source-width))_12px_minmax(560px,1fr)]"
      style={resize.gridStyle}
    >
      <div id="close-reading-source-pane" className="hidden xl:block">
        {readingSurface}
```

```40:40:frontend/pages/workspace/components/CloseReadingSplitLayout.tsx
        className="group hidden touch-none cursor-col-resize items-center justify-center border-x-2 border-border bg-background hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring xl:flex"
```

也就是说，这个区间的用户在 JS 里被当作桌面（因此不会得到移动端 dialog 的处理），
在 CSS 里却拿不到桌面布局。

同时，原文左栏（段落 Close Read 入口与 anchor 色块）以 `lg` 为界
（`ReadingSurface.tsx:270`），因此 1024px 以下既没有分屏，也没有从原文回到已保存 selection 的入口。

### 为什么这是产品问题

1. **它命中了一个真实且重要的设备段。** iPad 横屏、多数 11–13 寸笔记本的分屏窗口都落在这里。
   PROJECT.md 的视觉不变量第 8 条要求「桌面以 Reader + 可调整结果区为主」，
   这个区间既不是它，也不是明确的移动端形态。
2. **它使「不离开当前文本」在该区间不成立。** 核心任务的前半句就是不离开原文；
   此处 Close Reading 必然遮挡原文。
3. **它会削弱 Delivery 3 的验证价值。** Delivery 3 要求「在真实 desktop/mobile viewport 验证
   selection、sheet/dialog、focus」。当前 UX contract 只固定了 1280px 与 390px 两个宽度
   （见 workspace-journey-contract.md「范围与边界」），这个空洞刚好落在两者之间的盲区。

### 改进方向

- 统一断点语义：让 JS 的桌面判定与 CSS 的分屏能力使用同一个阈值，或为中间区间设计明确形态。
- 中间区间可以选择「可切换的覆盖层 + 明确的返回原文」，但需要是有意设计的形态，而非降级残留。
- 建议在 UX contract 中增加一个平板宽度场景，把这个区间纳入被测试保护的范围。

---

## P2 打磨项

### 文件导入错误对用户不可见

`importError` 只在粘贴编辑器展开时渲染，而文件导入路径通常处于收起状态：

```60:87:frontend/pages/workspace/components/ImportPanel.tsx
        {isPasteEditorOpen ? (
          <div className="mt-8 border-t-2 border-border pt-5">
...
            {importState.importError ? (
              <p role="alert" className="mt-2 text-sm font-bold text-error-foreground">
                {importState.importError}
              </p>
            ) : null}
```

因此「Only .txt and .md files are supported in Workspace Alpha.」与「The selected file is empty.」
（`useReadingLibrary.ts:123-133`）在最常见的触发路径上不会显示——用户选了一个 PDF，界面毫无反应。
这是一条静默失败，且发生在漏斗的第一步。

### Explain 与 Close Read 的语义差异没有传达

四个技能在选择工具条上是四个只有标签的按钮，没有任何说明：

```112:115:frontend/pages/workspace/components/ReadingSurface.tsx
        <Button type="button" size="sm" onClick={() => onRunSkill('explain')}>Explain</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onRunSkill('translate')}>Translate</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onRunSkill('vocab')}>Vocab</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onStartNote}>Note</Button>
```

Close Read 不在这里，它的段落入口是一个默认 `opacity-0`、仅 `lg` 以上、仅 hover/focus 可见的
24px 按钮（`ReadingSurface.tsx:270-281`）。两者走不同后端、产生不同布局，但界面没有解释区别。

需要注意 F3 已记录「Explain、Translate、Vocab 共用同一 workflow」，因此现在**不应该**编造
三者的差异化说明——那属于 Delivery 2 的工作。当前可以做的是让 Close Read 的「更重、更长、
针对整段或全文」这一点变得可预期，因为这个差异是真实存在的。

同时提醒：ROADMAP 的 Deferred 明确排除「Skill recommendation 或自动重排 selection toolbar」，
本节建议仅限于静态说明与可发现性，不涉及推荐。

### 选择工具条的定位与触屏可靠性

工具条宽度以常量 260px 估算来做右边界收敛，而实际有四个按钮，很可能宽于该值：

```231:233:frontend/pages/workspace/components/ReadingSurface.tsx
        top: Math.max(56, rect.top - 8),
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 260)),
```

选区检测只监听 `onMouseUp` 与 `onKeyUp`（`ReadingSurface.tsx:251-252`），没有 `touchend` 或
`selectionchange`。触屏上用拖拽手柄调整选区后，工具条既不会重新定位，也不保证出现。移动端
工具条固定在视口底部（`ReadingSurface.tsx:119`），与 iOS/Android 原生选择菜单争夺同一区域。

此外桌面与移动两套工具条同时存在于 DOM（仅靠 CSS 互斥），两者都带
`role="toolbar" aria-label="Selection actions"`，在无障碍树中形成两个同名 toolbar。

### 流式输出没有 live region

整个 workspace 阅读流程中不存在任何 `aria-live`。legacy 分析页有 sr-only 的阶段播报
（`AnalysisPanel.tsx:58`），主线流程没有对应机制。屏幕阅读器用户触发 Close Read 后，
不会被告知任务已开始、正在生成或已完成——运行状态仅由旋转图标与原始状态文本表达。

小尺寸控件同样值得注意：anchor 色块 16px、段落 Close Read 按钮 24px，均远低于 44px 触控目标；
不过这两者当前都只在 `lg` 以上出现，实际影响有限，但也说明窄屏缺少等价入口。

### 遗留入口与双套 chrome

`/app/analysis` 被标为 legacy，却仍在主菜单中（`WorkspaceHeader.tsx:117-120`），并且在 API key
沟通上比主线做得更好。Settings/About/Analysis 使用另一套 header，其中没有「Reading sessions」
入口，从 Settings 回到阅读需要点 logo。此外，reading-session 抽屉里的 legacy 分析删除是
一键无确认（`DocumentLibraryDrawer.tsx:156-159`），而同类操作在 `HistoryPanel` 中有确认对话框——
同一动作在两处的安全等级不一致。

「New session」（抽屉）与「New document」（工具栏菜单）指向同一行为，用词不一致
（`DocumentLibraryDrawer.tsx:269-271`、`ReaderToolbar.tsx:367-370`）。

### 界面文案中的工程腔

`Import_Text`（`ImportPanel.tsx:34`）、`SYSTEM_MANIFEST`、`DEEP_TEXT_ANALYSIS_ENGINE`
（`AboutPage.tsx:15-17`）、`INPUT_ZONE`、`INITIATE_ANALYSIS`（`AnalysisPanel.tsx:88,156`）等
snake_case/ALL_CAPS 文案属于风格选择，但与「帮助读者读懂困难文本」的定位存在张力，
尤其 About 页是新用户理解产品的入口之一。这属于品牌决策，此处仅记录，不作判断。

---

## 与现有契约和路线图的关系

以下改动如果实施，需要同步更新既有规范，不能只改代码：

| 建议 | 需要同步的规范 |
| --- | --- |
| 无 key 时改为前置阻止而非事后失败 | `workspaceHardening.test.tsx:236` 与本目录 UX contract |
| 原文持久标记 | UX contract 需新增「输出与原文的视觉关联」不变量 |
| Note 完成语义 | `noteFlow.test.ts`、UX contract 第 7 条相关描述 |
| 平板断点统一 | UX contract「范围与边界」中的视口清单 |
| 接回 stage 反馈 | 新增流式反馈相关场景 |

按 workspace-journey-contract.md 的维护规则，任何对 `workspaceJourney.test.tsx` 的修改都必须在
同一次变更中更新该文档并追加同步记录。

### 不建议现在做的事

为避免与 ROADMAP 的 Deferred 冲突，以下方向本次不予建议：

- Skill recommendation、自动重排 selection toolbar、自动 PreRead。
- 为 Explain/Translate/Vocab 编写差异化能力说明——F3 表明三者尚无独立语义，
  这属于 Delivery 2 的范围，提前在 UI 上宣称差异会造成错误预期。
- 富文本笔记编辑器、分享与协作。
- 深色模式：`index.css:78-108` 已有完整的 `.dark` token，但没有任何切换入口，
  且 `.prose` 使用硬编码 slate 色值（`index.css:194-298`）不随 token 变化。
  这是一个成本不高的机会，但与核心命题无关，不应挤占 Gate 1 的工作。

## 建议的验证顺序

这些结论来自代码审读，不能替代真实用户观察。若要在 Discover 0/1 中检验：

1. **P0-1（原文标记）** 最直接的验证是任务式观察：让参与者在获得一个解释后，指出解释对应原文的
   哪一句。记录成功率与耗时，这就是 `source passage 可定位率` 的第一份基线。
2. **P0-2（BYOK）** 应把 key 获取作为独立任务单独计时与观察，而不是混在首次 Explain 失败里，
   否则无法区分 H2 与 H6 的失败原因。
3. **P0-3（等待反馈）** 在受控网络下观察参与者在首 token 前的行为：是否重复点击、是否认为已损坏、
   是否放弃。这同时为 Discover 1 要求的「中断 stream」失败场景提供对照。
4. **P1-1（同步信任）** 可用一个直接问题检验：请参与者说明「如果现在换一台设备打开，
   刚写的笔记还在吗」，并记录他依据界面上的什么线索作答。
