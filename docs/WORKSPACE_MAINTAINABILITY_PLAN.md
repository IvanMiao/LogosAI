# Workspace 可维护性改造计划

- 状态：In progress
- 计划轮数：**8 轮**
- 目标分支：`codex/maintenance-workspace-boundaries`
- 基线：实施前从最新 `origin/main` 创建分支
- 核心约束：保持用户行为、HTTP payload、D1 schema 与 Workspace Journey contract 不变

## 为什么要分成八轮？

当前问题并不是缺少架构，而是架构边界只执行了一半：`Document`、`Reading session`、`Anchor`、`Artifact` 与 `Task` 已经形成稳定领域语言，但前端仍由一个 858 行的 `useWorkspace` 集中持有大部分状态与动作，`client-api` 还反向依赖 page 类型。

如果一次移动类型、拆 hook、重写 streaming lifecycle 并调整组件 props，测试失败时很难判断问题来自领域边界、React state closure，还是 Task 状态机。因此本计划将工作拆成八个单一主题；原则上每轮形成一个独立 commit，完成验证后才进入下一轮。

## 总览

| 轮次 | 状态 | 主题 | 主要结果 |
| --- | --- | --- | --- |
| 1 | [x] 已完成 | 建立基线与 Worker CI | 从最新 `main` 建分支，记录绿灯基线，Cloudflare checks 进入 CI |
| 2 | [x] 已完成 | 纠正领域类型所有权 | `client-api` 不再依赖 `pages/workspace` |
| 3 | [x] 已完成 | 下沉 Reading session 纯逻辑 | library、storage、cloud state、sync journal 离开 page 层 |
| 4 | [x] 已完成 | 隔离 selection offset | DOM `Range` 转换成为可单测模块 |
| 5 | [x] 已完成 | 拆出 library 与 preferences hooks | `useWorkspace` 不再直接管理导入、文档库和阅读偏好细节 |
| 6 | [x] 已完成 | 拆出 selection 与 artifact state | Anchor/Artifact 派生状态和写入职责形成清晰边界 |
| 7 | [x] 已完成 | 统一 Task lifecycle | Close Read 与 Anchor Skill 共享 streaming 状态机，但保留不同 transport |
| 8 | [ ] 未开始 | 收窄 UI 依赖并总体验证 | 展示组件不再通过索引类型依赖巨型 controller，完成全量回归 |

## 第 1 轮：建立可比较的基线

### 核心问题

重构是否安全，取决于我们能否证明“改造前后行为相同”。同时 Worker 是生产 API origin，却尚未进入 GitHub Actions，这使契约漂移可能绕过 CI。

### 改动

- 执行 `git fetch origin main`，确认远端最新提交。
- 从最新 `origin/main` 创建 `codex/maintenance-workspace-boundaries`。
- 在改代码前运行 frontend、Cloudflare 与 backend 检查，记录基线结果。
- 为 `.github/workflows/ci.yml` 增加 Cloudflare job：
  - `npm ci`
  - `npm run typecheck`
  - `npm test`
- 将本计划文档纳入分支。

### 验收

- 工作分支确实基于 fetch 后的 `origin/main`。
- Frontend、Cloudflare、backend 基线全部通过；若基线本身失败，先记录并停止结构改造。
- CI 能独立验证 Worker TypeScript 与 schema tests。

### 实施记录

- 基线 commit：`7d537c2`（fetch 后的 `origin/main`）。
- 工作分支：`codex/maintenance-workspace-boundaries`。
- Frontend：15 个 test files、88 个 tests 通过；lint、typecheck、build 通过。
- Cloudflare：5 个 test files、10 个 tests 通过；typecheck 通过。
- Backend：24 个 tests 通过；Ruff check 与 format check 通过。

## 第 2 轮：让领域类型向内依赖

### 核心问题

`frontend/client-api/workspaceApi.ts` 和 `anchorApi.ts` 当前 import `pages/workspace/workspace.types.ts`。这让底层 HTTP adapter 依赖页面实现，违反稳定依赖原则。

### 改动

- 建立 `frontend/features/reading/` 作为前端 Reading bounded context。
- 将以下领域类型移入 feature：
  - `WorkspaceDocument` / `DocumentSourceType`
  - `WorkspaceDocumentLibrary`
  - `ReaderPreferences` / `AnalysisLanguage`
  - `ReadingSessionSnapshot`
  - `WorkspacePreferencesPayload`
- 先保留现有类型名称，避免本轮混入 rename 噪音。
- 通过 feature barrel 导出稳定类型。
- 修改 page、component、test 与 `client-api` imports。
- 增加依赖方向检查，至少保证 `frontend/client-api/**` 不再引用 `pages/**`。

### 验收

- `rg "@/pages/" frontend/client-api` 无结果。
- 类型形状、序列化字段和 API payload 不变。
- Frontend lint、typecheck、tests、build 通过。

### 实施记录

- 新增 `frontend/features/reading/`，集中拥有 Reading domain 与 session boundary types。
- `client-api` 对 `pages/**` 的反向依赖已清零；HTTP 与 storage 字段未改变。
- Frontend 15 个 test files、88 个 tests 通过；lint、typecheck、build 通过。

## 第 3 轮：让 Reading session 逻辑拥有明确归属

### 核心问题

`Document` 与 `Reading session` 属于领域对象，但 library、storage、cloud merge 和 sync journal 仍放在 `pages/workspace/`。页面目录因此同时承担领域规则和 UI orchestration。

### 改动

- 将纯逻辑移动到 `frontend/features/reading/`：
  - document library operations
  - local storage parsing、migration 与 persistence
  - reading session snapshot conversion / merge
  - sync journal
- 保持 `useWorkspaceCloudSync` 在 page/application 层：它负责 effect 和流程编排，不属于纯领域逻辑。
- 将测试移动或改名，使测试路径与 feature 所有权一致。
- 不改变 storage key、version、migration 或 last-writer-wins 规则。

### 验收

- `pages/workspace` 不再拥有 Reading session 的纯 CRUD、storage 和 merge 实现。
- 旧 localStorage 数据仍可读取，dirty session 与 deletion tombstone 行为不变。
- Workspace storage、library、cloud-state、hardening tests 全部通过。

### 实施记录

- Reading core、library、storage、cloud state 与 sync journal 已移入 `features/reading/`。
- Cloud response types 同步归入 Reading session boundary，feature 不依赖 `client-api` 或 page。
- 领域单测移入 `tests/reading/`；15 个 test files、88 个 tests 通过。
- Frontend lint、typecheck、build 通过；storage keys、migration 与 merge 规则未改变。

## 第 4 轮：把 source position 从渲染中抽离

### 核心问题

`ReadingSurface.tsx` 同时负责长文渲染和 DOM `Range` → document offset。Source link 是产品正确性的核心，不应该只能通过组件集成测试间接验证。

### 改动

- 抽出 selection offset 模块，职责限定为：
  - 找到 range 两端所属 paragraph
  - 根据 `data-paragraph-start` 计算绝对 offset
  - 拒绝缺失、反向或空 range
- `ReadingSurface` 只负责读取 browser selection、调用转换函数并展示 toolbar。
- 增加针对以下情况的单元测试：
  - 单段 selection
  - 跨段 selection
  - Unicode 文本
  - 空 selection
  - 重复 quote 的第二次出现

### 验收

- `ReadingSurface.tsx` 不再包含 offset 算法细节。
- 选中第二个相同句子时仍产生第二处真实 offset。
- Workspace Journey contract 不变，相关 tests 全部通过。

### 实施记录

- DOM `Range` → document offset 已移入 `features/anchors/selection-offsets.ts`。
- 新增单段、跨段、Unicode、空选区和第二个重复 quote 的直接单元测试。
- `ReadingSurface` 只负责读取 browser selection 和触发 UI action。

## 第 5 轮：拆出 Document library 与阅读偏好

### 核心问题

如果直接重写整个 `useWorkspace`，React state、持久化失败处理与跨领域删除会同时变化。先拆低耦合部分，可以缩小后续 Task 改造的风险面。

### 改动

- 新建 `useReadingLibrary`，管理：
  - document library state
  - paste/file import state
  - open、rename、delete、start new document
  - legacy history import
  - local persistence failure
- 新建 `useReadingPreferences`，管理：
  - reader font、size、line spacing
  - analysis language
  - 对应 local persistence
- `useWorkspace` 保持 facade，组合两个 hook 并继续返回兼容的 controller 字段。
- Document 删除涉及 Anchor、Artifact 和 running Task 的部分仍由 facade 协调。

### 验收

- `WorkspaceController` 的调用方式暂时不变。
- import、storage failure、library switch、preference persistence tests 通过。
- `useWorkspace` 不再直接包含 file import 和 preference persistence 的实现细节。

### 实施记录

- 新增 `useReadingLibrary`，封装 Document library、import、legacy history 与持久化失败状态。
- 新增 `useReadingPreferences`，封装 Reader preferences、analysis language 与 cloud hydration。
- `useWorkspace` 保留 Document 删除后的 Anchor/Artifact/Task 清理，避免 hooks 循环依赖。
- Frontend 16 个 test files、93 个 tests 通过；lint、typecheck、build 通过。

## 第 6 轮：拆出 Anchor selection 与 Artifact state

### 核心问题

`useWorkspace` 当前混合原始 state、派生 selector、UI selection state 和持久化写入。任何 Anchor 改动都会触及 Artifact 与 Context Panel 的全部上下文。

### 改动

- 新建 `useReadingSelection`，管理：
  - pending selection 与 toolbar placement
  - active anchor
  - selection confirmation / dismissal
  - anchor activation 与删除
- 新建 `useArtifactCollection`，管理：
  - artifact storage persistence
  - active artifact selection
  - note draft
  - artifact/anchor 派生统计
- 将纯 selectors 移到 feature core，而不是留在 hook 文件。
- 跨 aggregate 删除继续由 `useWorkspace` 协调，避免两个 hook 互相 import。

### 验收

- Selection 改变不会改变已运行 Task 的 source identity。
- Note draft、active Artifact 与 Anchor marks 行为不变。
- Explain、note、hardening、journey tests 全部通过。

### 实施记录

- 新增 `useReadingSelection`，封装 Anchor storage、pending selection 与 active Anchor。
- 新增 `useArtifactCollection`，封装 Artifact storage、note draft、active Artifact 与 UI projection。
- Anchor selectors 移入 `features/anchors/anchor-core.ts`；跨 aggregate 删除仍由 facade 编排。
- `useWorkspace` 缩减到 606 行；16 个 test files、93 个 tests 与全部前端检查通过。

## 第 7 轮：统一 streaming Task lifecycle

### 核心问题

`runCloseRead` 与 `runAnchorSkillForAnchor` 使用不同 API，但重复实现 Artifact 创建、AbortController、chunk append、complete/fail/stop 与 controller cleanup。重复的不是产品语义，而是 Task 状态机。

### 改动

- 新建 `useArtifactTasks` 或等价 application service。
- 抽出统一 lifecycle：

```text
create running Artifact
  → register AbortController
  → receive metadata/chunks
  → complete | stopped | failed
  → unregister controller
```

- 为两条 transport 提供独立 adapter：
  - Anchor Skill 保留 request/trace/anchor identity 更新。
  - Close Read 继续使用 legacy `/api/analyze/stream`，不伪造现阶段不存在的 server identity。
- Retry 通过 Artifact type 选择 adapter；不改变 prompt、context 或 API request shape。

### 验收

- lifecycle 的状态转换只实现一次。
- abort、network error、missing key、retry 与 metadata replacement 都有测试。
- `error` 后不会把 Artifact 标为 complete；stop 保留 partial content。
- 不修改 FastAPI、Worker gateway 或 AI 语义。

### 实施记录

- 新增 `useArtifactTasks`，统一 Artifact 创建、metadata、chunk、complete/fail/stop 与 controller cleanup。
- Close Read 与 Anchor Skill 仅作为独立 transport adapter 注入，API request shape 未改变。
- 新增 success、metadata replacement、network failure、abort/partial、retry 与 missing-config tests。
- `useWorkspace` 缩减到 519 行；17 个 test files、98 个 tests 与全部前端检查通过。

## 第 8 轮：收窄展示层依赖并完成回归

### 核心问题

即使内部 hook 已拆开，若组件仍依赖整个 `WorkspaceController` 或使用 `WorkspaceController['method']`，展示层仍会随着 controller 的任意变化重新耦合。

### 改动

- 为 `ReaderWorkspace`、`ReadingSurface`、`ReaderToolbar`、`ImportPanel` 定义最小 typed props。
- 去掉展示组件中的 `WorkspaceController['...']` 索引类型。
- 保留 page 作为 composition root，由它将 facade 切成所需 view model 和 actions。
- 删除重构过程中产生的 compatibility exports 与未使用 helpers。
- 更新本计划状态，记录每轮 commit 与验证结果。
- 运行全量检查并审阅最终 diff。

### 验收

- 展示组件不 import `WorkspaceController`。
- `useWorkspace` 只保留组合、跨领域协调和稳定 facade。
- Frontend、Cloudflare、backend 全量检查通过。
- HTTP payload、D1 schema、storage keys、用户可见文案和 Workspace Journey contract 无变化。

## 每轮统一验证规则

每轮至少运行与改动相关的局部测试；进入下一轮前运行对应 package 的完整检查。最终轮运行：

```bash
# Frontend
cd frontend
npm run lint
npx tsc --noEmit
npm test
npm run build

# Cloudflare Worker
cd ../cloudflare
npm run check

# Backend
cd ../backend
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

如果某轮需要改变 API payload、D1 schema、storage migration、Workspace Journey contract 或用户行为，应停止该轮，把它拆成新的产品/架构决策，而不是继续作为“维护性重构”提交。

## 本计划明确不处理什么？

- 不删除 `/app/analysis` 或 legacy history import。
- 不删除 PostgreSQL scaffolding。
- 不合并 Backend 的 LangGraph 与 streaming workflow。
- 不统一全仓库文件命名。
- 不批量重写 Tailwind chrome classes。
- 不建立 monorepo shared types package。
- 不修改 Explain、Translate、Vocab 或 Close Read 的产品语义。

这些问题可以后续独立评估。把它们留在本计划之外，本质上是在保护此次重构的可归因性：如果测试或行为发生变化，我们能够准确知道是哪一轮、哪一条边界造成的。
