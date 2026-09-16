# Workspace Journey UX Contract

- 状态：Active；文档核对：2026-09-17
- 可执行规范：[workspace-journey.test.tsx](../../frontend/tests/workspace/workspace-journey.test.tsx)

## 当前界面模型

Destination 是 reader / history；Reader layout 是 source / split / analysis。
桌面默认双栏，窄屏默认单栏；三个布局按钮只改变阅读区域布局，History 是独立查询入口。
Explain 为关联原文的当前详情，Close Reading 为整篇分析。

阅读顶栏保持单行，依据工具栏实际可用宽度收起次要操作。不足 900px 时常驻
Sessions、截断标题、布局切换、语言和菜单；History、Reading appearance 与品牌主页入口
仅在窄工具栏菜单中显示；宽屏保留 History、外观与主页快捷入口，菜单不重复显示。
菜单按工具栏实际可用宽度切换，固定侧栏后的窄工具栏仍保留入口；布局按钮保留 aria-pressed。
菜单不显示已配置 key 或正常同步状态文字；缺 key 的提示与横幅保留，窄屏通过菜单 Settings 配置。
宽屏同步状态只显示图标，保存中使用动态指示；离线/失败仍直接显示文字与 Retry sync。
语言按钮仅显示语言名称（不足 600px 使用缩写），直接下拉展示七种语言选项，
弹出内容标明 AI output language 和 Applies to your next request。
Reading appearance 独立打开外观弹窗，调整字体、字号、行距与行宽；从菜单打开后
关闭弹窗恢复该菜单项焦点，Escape 可继续关闭菜单并返回菜单按钮。
七种输出语言、字体联动、文字大小、行距与行宽复用现有偏好；外观即时生效。
语言只影响下一次 AI 请求（包括 Retry），不重跑已有结果，也不修改运行中请求；
Reset appearance 只重置外观，不改变语言，不引入每篇偏好继承。

导入页面直接显示 Source text，随后是可选标题及 Open file / Start reading。
不支持的格式、空文件和读取异常在按钮上方显示原因与下一步操作；文件失败不清空
粘贴文本和标题。文件导入成功直接打开阅读；粘贴输入为空时禁用 Start reading。

Explain 引文超过三行时默认折叠，提供 Show full quote / Show less；短引文无折叠按钮。
Show in source 先验证原文位置或唯一引用匹配，桌面恢复双栏、窄屏切到原文并定位；
保留同一成果、任务和笔记，不新建选段或请求 AI。无法唯一定位时禁用入口并说明原因，
保留引用快照。Explain 栏顶固定显示当前状态、真实生成阶段和文字版 Stop / Retry；
部分输出与错误继续保留，Retry 创建新输出，不覆盖旧成果。


Sessions 是始终位于左侧的跨 session 导航，不展开 artifact 子树。未固定时为临时抽屉，
打开 session 后关闭；桌面固定后为常驻侧栏，切换 session 时保持可见。Unpin 在原侧
恢复临时抽屉，Collapse 直接收起；两种模式共享搜索条件。窄屏只提供左侧抽屉，
保留桌面的固定偏好。
列表采用紧凑条目：标题、最近打开日期与当前项标记；搜索正文时按需显示命中摘要。
文本信息、selection / reading entry 计数及重命名、删除收进每项的 More options 菜单。
来源与字数仅按需显示在该菜单，阅读工具栏不常驻显示。
History 查询当前 session 已保存工作，
打开条目不重新请求 AI。关闭详情不删除成果；笔记与 AI 输出均关联原文。
阅读偏好默认统一作用于原文和分析，只有明确解除联动后分开调整。

## 已有测试场景

编号保持稳定；WJ-13 补录现有截断回归。测试顺序不等于编号顺序。

| ID | 动作 | 必须保持 |
| --- | --- | --- |
| WJ-01 | 打开 session、切换布局、打开 History | 默认 Show source and analysis；布局按钮 aria-pressed 表达选中；空分析有 Start Close Reading；History 显式打开，默认 recent |
| WJ-02 | Explain paragraph，等待完成 | 创建 paragraph anchor 与 explanation；自动保存；不创建 paragraph close_read |
| WJ-03 | Start Close Reading；已有结果时切换语言并 Run again | 请求整个 document，按新选语言创建新的 close_read，保留并可切换旧结果 |
| WJ-04 | 从 Close Reading 原文打开 saved Explain，再返回 | Explain 替换分析正文；Back to Close Reading 恢复同一分析，不重新请求 |
| WJ-05 | 打开 History，切换 Source order | 默认 updatedAt 倒序；原文顺序按 source offset；使用 session 内 list-detail |
| WJ-06 | History 条目 → Open in Text | 当前桌面测试恢复双栏及对应解释，精确 range 使用 mark；不发起新请求，也不增加常驻返回条 |
| WJ-07 | 打开 Reading appearance，调整阅读外观，解除字体联动 | 默认原文/分析偏好统一；即时生效；解除后可分别调字体 |
| WJ-08 | 左侧 Sessions drawer → Pin → Unpin / Collapse | 紧凑平坦导航；两种模式均在左侧；固定时切换保持侧栏；pin 偏好持久化；取消固定保留抽屉，收起后可重新打开 |
| WJ-09 | 启动 Close Reading，先 stage 后正文 | 显示真实 interpret 阶段文案；完成后由正文替代 |
| WJ-10 | 无 key 时 Explain，再打开 History | 顶部 Settings 黄条，不另出红色错误；不创建污染 History 的失败 artifact |
| WJ-11 | 重载带 running artifact 的 session | 恢复为 stopped；可 Retry，不再显示 Stop |
| WJ-12 | 选择旧 Close Reading 版本，切换布局再返回 | 恢复仍有效的所选版本，不强制跳到最新版本 |
| WJ-13 | Explain paragraph 收到部分正文后提前 EOF | 保留部分输出，artifact 为 failed；显示错误和 Retry，不误标 complete |
| WJ-14 | Explain → Show in source，桌面及窄屏 | 定位精确引用；窄屏返回分析仍是同一结果；不发起 AI、不新增成果 |
| WJ-15 | 打开已无法定位的 Explain | 保存的引文及结果可读；定位入口禁用并说明原因 |
| WJ-16 | 粘贴草稿后导入不支持/空/不可读文件，再开始阅读 | 错误直接可见；保留标题和文本；可继续完成粘贴导入（hardening 测试） |
| WJ-17 | 从菜单打开 History、Reading appearance，再关闭弹窗与菜单 | History 使用原查询入口；外观不含语言控件；Escape 依次恢复外观菜单项和菜单按钮焦点 |


## 阅读现场与导航（E1）

- session 切换写入 `/app/readings/:documentId`；`/app` 恢复最近阅读，`/app/new` 打开导入。
- History 打开结果使用 `?artifact=`；History 自身使用 `?view=history`。打开旧成果不请求 AI。
- 顶栏 History 与浏览器后退可返回原查询、筛选、排序、选中条目及滚动位置；从 History 打开成果后不增加 `Back to History` 返回条。
- 每个用户、每篇原文独立保存布局、比例、详情选择与阅读位置；切换和刷新恢复有效现场。
- 原文与各成果分别保存段落签名、段内比例及像素回退；字体、宽度重排尽量恢复同一段落。
  无法唯一匹配变化后的内容时回到顶部，不猜测另一段。显式定位原文覆盖旧位置。
- 恢复等待布局和字体就绪；用户开始滚动或选择后停止延迟回拉。
- History 返回时在原控件仍存在且没有其他焦点目标时恢复焦点；不恢复浏览器原生文本选区。
- 云端加载中不显示错误的缓存 session；无效/其他账号地址提示不可用；失败可以重试。
  成果缺失不妨碍继续阅读对应原文：使用不占布局空间的可关闭浮层，8 秒后自动关闭并清理失效成果地址；
  鼠标悬停或键盘聚焦时暂停计时，可直接打开 History。主动删除当前地址对应的成果或 source 时同步清理地址。
  损坏的视图快照使用默认值，存储满时明确提示。
- 笔记与任务保持既有保存路径；现场快照只保存编辑器状态，不复制正文或启动任务。

自动化与本地浏览器证据见[阅读导航验收](reading-navigation-verification.md)。
讨论模型、常驻 agent 和跨设备视图同步仍属目标设计。

## 测试与未验证范围

旅程测试使用 React Testing Library、localStorage fixture、mock SSE 和模拟 1280px 桌面。
它不调用真实 Gemini、后端或云同步，不替代真实浏览器及模型质量检查。
WJ-11 覆盖重载恢复，WJ-13 覆盖 Anchor 截断后的界面与保存状态。
Anchor 提前 EOF、缺失 done、身份不一致、服务端 error
和 UTF-8 分片由独立的 [SSE 客户端测试](../../frontend/tests/client-api/anchor-stream.test.ts)
覆盖；真实服务断流与恢复仍需浏览器验收。

2026-09-13 Sessions 局部浏览器验收：本地 Vite + Worker、测试账号，桌面 1280px
及 390px / 320px 窄屏。已检查左侧抽屉、固定 / 取消固定、两个 session 切换、
长标题截断及菜单完整标题、重命名输入焦点与 Escape 取消、取消删除后返回列表。
固定后焦点进入侧栏搜索；窄屏无固定按钮，抽屉内容未横向溢出。
本轮不包含真实 AI 请求、屏幕阅读器或 200% zoom 验收。

2026-09-16 本次界面变更的本地浏览器与模拟流验证见[阅读控件验收](reading-ui-refinements-verification.md)。

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
