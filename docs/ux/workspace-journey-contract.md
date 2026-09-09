# Workspace Journey UX Contract

- 状态：Active；同步：2026-09-08
- 可执行规范：[workspace-journey.test.tsx](../../frontend/tests/workspace/workspace-journey.test.tsx)
- 本次同步 History 返回、Close Reading 再次运行入口及对应可执行测试

## 当前界面模型

Destination 是 reader / history；Reader layout 是 source / split / analysis。
桌面默认双栏，三个布局按钮只改变阅读区域布局，History 是独立查询入口。
Explain 为关联原文的当前详情，Close Reading 为整篇分析，不是三个并列顶层模式。

Sessions 是跨 session 导航，不展开 artifact 子树。History 查询当前 session 已保存工作，
打开条目不重新请求 AI。关闭详情不删除成果；笔记与 AI 输出均关联原文。
阅读偏好默认统一作用于原文和分析，只有明确解除联动后分开调整。

## 已有测试场景

编号沿用旧契约；新增 WJ-12 对应现有版本恢复测试。测试顺序不等于编号顺序。

| ID | 动作 | 必须保持 |
| --- | --- | --- |
| WJ-01 | 打开 session、切换布局、打开 History | 默认 Show source and analysis；布局按钮 aria-pressed 表达选中；空分析有 Start Close Reading；History 显式打开，默认 recent |
| WJ-02 | Explain paragraph，等待完成 | 创建 paragraph anchor 与 explanation；自动保存；不创建 paragraph close_read |
| WJ-03 | Start Close Reading；已有结果时切换语言并 Run again | 请求整个 document，按新选语言创建新的 close_read，保留并可切换旧结果 |
| WJ-04 | 从 Close Reading 原文打开 saved Explain，再返回 | Explain 替换分析正文；Back to Close Reading 恢复同一分析，不重新请求 |
| WJ-05 | 打开 History，切换 Source order | 默认 updatedAt 倒序；原文顺序按 source offset；使用 session 内 list-detail |
| WJ-06 | History 条目 → Open in Text | 当前桌面测试恢复双栏及对应解释，精确 range 使用 mark；不发起新请求，也不增加常驻返回条 |
| WJ-07 | 调整阅读设置，解除字体联动 | 默认原文/分析偏好统一；即时生效；解除后可分别调字体 |
| WJ-08 | Sessions drawer → Pin → Collapse | 平坦导航；pin 偏好持久化；收起后可重新打开 |
| WJ-09 | 启动 Close Reading，先 stage 后正文 | 显示真实 interpret 阶段文案；完成后由正文替代 |
| WJ-10 | 无 key 时 Explain，再打开 History | 顶部 Settings 黄条，不另出红色错误；不创建污染 History 的失败 artifact |
| WJ-11 | 重载带 running artifact 的 session | 恢复为 stopped；可 Retry，不再显示 Stop |
| WJ-12 | 选择旧 Close Reading 版本，切换布局再返回 | 恢复仍有效的所选版本，不强制跳到最新版本 |

## 阅读现场与导航（E1，2026-09-07）

- session 切换写入 `/app/readings/:documentId`；`/app` 恢复最近阅读，`/app/new` 打开导入。
- History 打开结果使用 `?artifact=`；History 自身使用 `?view=history`。打开旧成果不请求 AI。
- 顶栏 History 与浏览器后退可返回原查询、筛选、排序、选中条目及滚动位置；从 History 打开成果后不增加 `Back to History` 返回条。
- 每个用户、每篇原文独立保存布局、比例、详情选择与阅读位置；切换和刷新恢复有效现场。
- 原文与各成果分别保存段落签名、段内比例及像素回退；字体、宽度重排尽量恢复同一段落。
  无法唯一匹配变化后的内容时回到顶部，不猜测另一段。显式定位原文覆盖旧位置。
- 恢复等待布局和字体就绪；用户开始滚动或选择后停止延迟回拉。
- History 返回时在原控件仍存在且没有其他焦点目标时恢复焦点；不恢复浏览器原生文本选区。
- 云端加载中不显示错误的缓存 session；无效/其他账号地址提示不可用；失败可以重试。
  成果缺失不妨碍继续阅读对应原文。损坏的视图快照使用默认值，存储满时明确提示。
- 笔记与任务保持既有保存路径；现场快照只保存编辑器状态，不复制正文或启动任务。

默认桌面双栏、窄屏单栏未改变；讨论模型、常驻 agent 和跨设备视图同步不属于 E1。
自动化与本地浏览器证据见[阅读导航验收](reading-navigation-verification.md)。

## 测试与未验证范围

旅程测试使用 React Testing Library、localStorage fixture、mock SSE 和模拟 1280px 桌面。
它不调用真实 Gemini、后端或云同步，不替代真实浏览器及模型质量检查。
WJ-11 仅覆盖重载恢复。Anchor 提前 EOF、缺失 done、身份不一致、服务端 error
和 UTF-8 分片由独立的 [SSE 客户端测试](../../frontend/tests/client-api/anchor-stream.test.ts)
覆盖；真实服务断流与恢复仍需浏览器验收。

浏览器验收应另记环境、日期、版本和结果：

- 注册、登录、保存 key、云同步、断网与重新登录恢复。
- 桌面/390px 窄屏、200% zoom、长标题、跨段与重复文本选区。
- 布局 resize 的 pointer/keyboard、焦点、scroll 与返回路径。
- 真实 stream 的 stop/retry/截断及缺 key 失败。

原文行长保持可读；长输出用阅读字体；品牌与控制可保留 mono 和现有视觉语言。
状态不只靠颜色，icon button 有 accessible name，hover 操作也可 focus；这些设计约束
需要专门检查，不能因为该旅程测试通过就宣称全部已验证。

## 维护

行为变化时同次提交更新测试与对应场景；纯文档纠偏无需修改测试制造无关 diff。
只改测试结构时说明行为未变。检查命令统一见 [README](../../README.md#verify-changes)；
单独运行旅程可用 `npm test -- --run tests/workspace/workspace-journey.test.tsx`（frontend 内）。

2026-08-23 的三模式设计与 QA 已移至本地 `docs/archive/`（Git 忽略），不再作为当前布局规范。
