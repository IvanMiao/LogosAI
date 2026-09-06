# Workspace Journey UX Contract

- 状态：Active；同步：2026-09-05
- 可执行规范：[workspace-journey.test.tsx](../../frontend/tests/workspace/workspace-journey.test.tsx)
- 本次为文档追赶现有代码和测试；没有改变产品行为或运行测试

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
| WJ-03 | Start Close Reading | 请求整个 document，创建 document anchor 与 close_read，显示并保存结果 |
| WJ-04 | 从 Close Reading 原文打开 saved Explain，再返回 | Explain 替换分析正文；Back to Close Reading 恢复同一分析，不重新请求 |
| WJ-05 | 打开 History，切换 Source order | 默认 updatedAt 倒序；原文顺序按 source offset；使用 session 内 list-detail |
| WJ-06 | History 条目 → Open in Text | 当前桌面测试恢复双栏及对应解释，精确 range 使用 mark；不发起新请求 |
| WJ-07 | 调整阅读设置，解除字体联动 | 默认原文/分析偏好统一；即时生效；解除后可分别调字体 |
| WJ-08 | Sessions drawer → Pin → Collapse | 平坦导航；pin 偏好持久化；收起后可重新打开 |
| WJ-09 | 启动 Close Reading，先 stage 后正文 | 显示真实 interpret 阶段文案；完成后由正文替代 |
| WJ-10 | 无 key 时 Explain，再打开 History | 顶部 Settings 黄条，不另出红色错误；不创建污染 History 的失败 artifact |
| WJ-11 | 重载带 running artifact 的 session | 恢复为 stopped；可 Retry，不再显示 Stop |
| WJ-12 | 选择旧 Close Reading 版本，切换布局再返回 | 恢复仍有效的所选版本，不强制跳到最新版本 |

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
