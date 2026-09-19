# Workspace Journey UX Contract

- 状态：Active；行为基线：2026-09-17；2026-09-18 精简文档，未改变产品行为
- 可执行规范：[workspace-journey.test.tsx](../../frontend/tests/workspace/workspace-journey.test.tsx)

## 当前界面模型

Destination 是 reader / history；Reader layout 是 source / split / analysis。
桌面默认双栏，窄屏默认单栏；三个布局按钮只改变阅读区域布局，History 是独立查询入口。
Explain 为关联原文的当前详情，Close Reading 为整篇分析。

- 顶栏保持单行，按实际可用宽度将 History、外观和主页入口收进菜单；宽屏菜单不重复快捷入口。
  缺 key 有 Settings 入口；正常 key/同步不占常驻文字，离线/失败直接显示原因与 Retry sync。
- 语言直接下拉选择，只影响下一次 AI 请求（含 Retry），不重跑已有成果或修改运行中请求。
  外观独立即时生效，默认联动原文与分析；解除后可分别调整；Reset appearance 不改变语言。
  外观弹窗关闭后恢复触发器焦点，从菜单打开时可继续 Escape 返回菜单按钮。
- 导入页直接显示粘贴区；文件成功后打开阅读，失败显示原因并保留标题与文本；空粘贴不能开始阅读。
- Explain 长引文默认折叠，可展开；Show in source 验证原位置或唯一匹配后定位。
  桌面恢复双栏，窄屏显示原文，保留同一成果与任务；无法定位时保留引用和解释，并禁用入口说明原因。
  栏顶保留真实状态、阶段和 Stop/Retry；失败保留部分输出，Retry 新建输出，不覆盖旧成果。
- Sessions 始终在左侧，抽屉打开阅读后关闭，桌面固定侧栏切换后保持可见。
  Unpin 恢复抽屉，Collapse 收起；共享搜索，窄屏保留桌面固定偏好。条目平坦，不展开成果子树，
  元数据、计数、重命名和删除按需在条目菜单显示。
- History 查询当前 session 的已保存工作；打开旧条目不请求 AI，关闭详情不删除成果。
  用户笔记与 AI 输出关联原文，AI 不覆盖用户笔记。

## 已有测试场景

编号保持稳定；实现细节以链接的可执行测试为准，不在这里记录每次运行结果。

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

讨论模型、常驻 agent 和跨设备视图同步仍属[目标设计](reading-workspace-evolution.md)。

## 测试与未验证范围

| 测试入口 | 覆盖 |
| --- | --- |
| [旅程](../../frontend/tests/workspace/workspace-journey.test.tsx)、[失败路径](../../frontend/tests/workspace/workspace-hardening.test.tsx) | 上述场景、导入失败与草稿保留 |
| [阅读控件](../../frontend/tests/workspace/reading-controls.test.tsx) | 语言、外观、菜单、同步失败及重试 |
| [导航](../../frontend/tests/workspace/reading-navigation.test.tsx)、[地址加载](../../frontend/tests/workspace/reading-route-loading.test.tsx)、[滚动](../../frontend/tests/workspace/reading-scroll.test.ts) | 深链、History 返回、账号隔离、现场与重排恢复 |
| [SSE 客户端](../../frontend/tests/client-api/anchor-stream.test.ts) | 提前 EOF、缺 done、身份不一致、error、UTF-8 分片 |

组件测试使用 localStorage fixture、mock SSE 与模拟视口，不调用真实 Gemini 或云服务。
真实浏览器需按改动覆盖桌面/窄屏、实际 200% 缩放、长标题/选区、键盘焦点、resize 与返回；
数据或流变更还需检查登录恢复、断网、真实 stop/retry 和缺 key。每次结果写 PR，原始日志留本地。
已完成的工程验收与当前优先项统一见[路线图](../roadmap.md#已完成的工程验收)。

原文行长保持可读；长输出用阅读字体；品牌与控制可保留 mono 和现有视觉语言。
状态不只靠颜色，icon button 有 accessible name，hover 操作也可 focus；这些设计约束
需要专门检查，不能因为该旅程测试通过就宣称全部已验证。

## 维护

只在持久交互规则变化时更新对应条目与测试；视觉微调在 PR 说明即可，不新建 UX 文档。
纯文档纠偏无需修改测试；只改测试结构时说明行为未变。检查命令统一见 [README](../../README.md#verify-changes)；
单独运行旅程可用 `npm test -- --run tests/workspace/workspace-journey.test.tsx`（frontend 内）。

## 云写入冲突恢复

阅读保存和删除带基准 revision，旧版本不会覆盖云端新版。同步冲突显示失败和 Retry；
重试后保留云端阅读，并把未同步本地内容保存为新的 `(conflict copy)` session，
成果与 anchor 重新编号。旧删除与云端新修改冲突时保留云端阅读；
远端已删除的本地改动保存为新副本，不复活原地址。

验收范围与版本见[项目参考](../project.md#已记录的生产验收)。
新建阅读的云快照只引用属于该阅读的 active anchor，避免切换阅读后保存被拒绝。
