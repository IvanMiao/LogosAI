# 阅读控件与导入反馈验收

- 日期：2026-09-16
- 分支：`codex/reading-ui-refinements`，基于本地 `f4ada22`
- 范围：经线框确认的导入、Explain 引文与任务控件、顶栏分组、Reading 设置。
- 环境：本地 Vite、Chrome headless、合成阅读文档；运行真实 React 组件，AI 使用本地模拟 SSE。
  浏览器验证入口与数据均为临时文件，未加入产品路由。

## 首轮检查（2026-09-16）

| 场景 | 结果 |
| --- | --- |
| 桌面 1280px、窄屏 390px / 320px、640px 宽度 | 阅读与 Reading 弹窗无页面或顶栏横向溢出；控件可操作 |
| 1024px 固定 Sessions 侧栏 | 顶栏根据剩余宽度换行，History 与 Reading 可见 |
| 长引用折叠、展开、收起；短引用 | 默认三行；展开显示完整引文；短引用不显示展开按钮 |
| Explain → Show in source | 桌面双栏、窄屏单栏原文；定位并高亮；可返回同一解释 |
| 引用无法匹配 | 禁用定位并说明原因，保留引文与结果 |
| 模拟流 Retry → stage + partial → 修改语言 → Stop | 流中保留阶段与文字 Stop；停止后显示 Retry 并保留部分结果 |
| 修改语言、外观、解除字体联动 | 沿用当前偏好语义；语言不重新请求已有成果，界面显示所选语言 |
| 导入格式失败 | 错误在操作按钮前显示；标题与粘贴文本保留 |
| 缺 key | 入口与横幅仍可见 |

已人工查看桌面、390px、Reading 弹窗和固定侧栏截图。
正常导入、文件读取失败、空文件、存储失败、无效定位、无额外 AI 请求与同步重试另有自动化回归。

## 语言与外观拆分复查（2026-09-17）

根据反馈，将 Reading 改为直接下拉选择七种语言；旁边独立的 Reading appearance
按钮打开字体、字号、行距和行宽设置。窄屏 History 使用图标以保留控件空间。

- 本地 Chrome：1280px、390px、320px、640px 下检查语言下拉、选择后关闭及独立外观弹窗；无横向溢出。
- 1024px 固定 Sessions 侧栏：顶栏控件可见，无横向溢出。
- 已查看桌面和 320px 语言下拉截图；浏览器无页面错误。
- 自动化回归确认：语言下拉不打开弹窗，不显示外观控件；切换语言不发起请求，下一次分析使用所选语言；外观弹窗不含语言选择。
- 本轮未调用 AI 或云服务；前端 lint、类型检查、158 项测试和构建全部通过。

## 自动化入口

- `frontend/tests/workspace/workspace-journey.test.tsx`：Reading 语言与外观、Explain 返回和定位、流终态。
- `frontend/tests/workspace/workspace-hardening.test.tsx`：可见粘贴区、文件导入、格式/空/读取错误保留草稿。
- `frontend/tests/workspace/reading-controls.test.tsx`：同步失败/离线的直接重试与恢复。
- 前端检查：`npm run lint`、`npx tsc --noEmit`、`npm test`、`npm run build` 全部通过；26 个测试文件、158 项测试。

## 验证边界

没有调用真实 Gemini 或云服务；不将模拟结果作为模型质量、生产同步或跨设备验收。
640px 是窄可用宽度检查，不替代真实 200% 浏览器缩放；屏幕阅读器与触控设备未在本次验证。
