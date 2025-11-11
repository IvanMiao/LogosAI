### 1. React Context 如何进行优化？

使用 React Context 进行优化的核心思想是：**将状态和操作逻辑提升到 Context 中，让任何需要的组件都能直接“消费”，从而避免逐层传递 props**。

以下是具体步骤，我们将创建一个 `AnalysisContext` 来封装 `useAnalysis` hook 的所有功能。

#### 第 1 步：创建 Context 文件

在 `frontend/src` 目录下创建一个新文件夹 `context`，并在其中创建 `AnalysisContext.jsx` 文件。

```javascript
// frontend/src/context/AnalysisContext.jsx
import React, { createContext, useContext } from 'react';
import { useAnalysis } from '@/hooks/useAnalysis';

// 1. 创建 Context
const AnalysisContext = createContext(null);

// 2. 创建 Provider 组件
//    这个组件将包含所有逻辑，并通过 Provider 将其提供给子组件
export function AnalysisProvider({ children }) {
  const analysisData = useAnalysis(); // 调用 hook，获取所有状态和函数
  return (
    <AnalysisContext.Provider value={analysisData}>
      {children}
    </AnalysisContext.Provider>
  );
}

// 3. 创建一个自定义 hook，方便消费 Context
//    这样其他组件就不需要每次都导入 useContext 和 AnalysisContext
export function useAnalysisContext() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysisContext must be used within an AnalysisProvider');
  }
  return context;
}
```

#### 第 2 步：在应用顶层使用 Provider

修改 `App.jsx`，用我们刚创建的 `AnalysisProvider` 包裹主应用区域。

```jsx
// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
// ... 其他 import
import { AnalysisProvider, useAnalysisContext } from '@/context/AnalysisContext'; // 导入 Provider

// AppWrapper 组件将包含所有需要访问 Context 的内容
function AppWrapper() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState('home');
  // 从 Context 中获取 fetchHistory，而不是 App 组件自己管理
  const { fetchHistory } = useAnalysisContext();

  useEffect(() => {
    setMounted(true);
    fetchHistory();
  }, [fetchHistory]); // fetchHistory 是从 hook 中来的，最好加入依赖项

  const viewComponents = {
    home: (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* 不再需要传递任何 props！ */}
          <AnalysisPanel />
        </div>
        <div className="lg:col-span-1">
          {/* 不再需要传递任何 props！ */}
          <HistoryPanel />
        </div>
      </div>
    ),
    settings: <SettingsView />,
    about: <AboutView />,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Header mounted={mounted} activeView={activeView} onViewChange={setActiveView} />
        <main className={`...`}>
          {viewComponents[activeView]}
        </main>
      </div>
    </div>
  );
}

// 最终的 App 组件
function App() {
  return (
    <AnalysisProvider>
      <AppWrapper />
    </AnalysisProvider>
  );
}

export default App;
```

#### 第 3 步：在子组件中消费 Context

现在，`AnalysisPanel` 和 `HistoryPanel` 可以直接从 Context 获取所需的数据和函数，不再需要从 `App.jsx` 接收 props。

**修改前 (`AnalysisPanel.jsx`):**
```jsx
export function AnalysisPanel({ text, setText, language, setLanguage, result, isLoading, error, onAnalyze }) {
  // ...
}
```

**修改后 (`AnalysisPanel.jsx`):**
```jsx
import { useAnalysisContext } from '@/context/AnalysisContext'; // 导入自定义 hook

export function AnalysisPanel() {
  // 直接从 Context 获取所有需要的东西
  const { text, setText, language, setLanguage, result, isLoading, error, handleAnalyze } = useAnalysisContext();

  return (
    // ... JSX 代码完全不变，只是获取数据的方式变了
    // 注意: onAnalyze prop 需要改为 handleAnalyze
  );
}
```

`HistoryPanel` 的改造方式也完全相同。

---

### 2. JS 代码转换成 TS 代码的工作量有多少？

对于您当前的应用规模，将现有核心 JS/JSX 文件转换为 TS/TSX 的工作量是**中等偏低**的，完全可控。

以下是具体分析：

1.  **文件重命名**:
    *   首先需要将 `.js`/`.jsx` 文件后缀改为 `.ts`/`.tsx`。这是一个简单的批量操作。
    *   涉及文件: `App.jsx`, `useAnalysis.js`, `AnalysisPanel.jsx`, `HistoryPanel.jsx`, `helpers.js` 等。

2.  **添加类型定义 (主要工作量所在)**:
    *   **`useAnalysis.js` -> `useAnalysis.ts`**: 这是核心。需要为 `history` 数组中的对象定义一个 `interface` (例如 `HistoryItem`)，并为 `useState` 的所有状态添加类型。
        ```typescript
        interface HistoryItem {
          id: number;
          prompt: string;
          result: string;
          timestamp: string;
        }
        const [history, setHistory] = useState<HistoryItem[]>([]);
        const [text, setText] = useState<string>('');
        ```
    *   **组件 (`.jsx` -> `.tsx`)**: 需要为组件的 props 定义类型。不过，**如果您先进行 Context 优化，这一步会变得极其简单**，因为像 `AnalysisPanel` 这样的组件将不再接收大量 props，从而极大简化后续为组件添加类型的工作。
    *   **`helpers.js` -> `helpers.ts`**: 这个工作量很小，只需为每个工具函数的参数和返回值添加类型即可。
        ```typescript
        // before
        export const formatDate = (timestamp) => { ... }

        // after
        export const formatDate = (timestamp: string | number): string => { ... }
        ```

3.  **解决类型错误**:
    *   转换后，TypeScript 编译器可能会报告一些隐式的 `any` 类型或潜在的 `null` / `undefined` 问题。修复这些问题是主要的工作，但这本身也是一个**代码质量提升**的过程。

**总结**:

*   **预估时间**: 对于一位熟悉 TypeScript 的开发者来说，完成整个转换工作可能需要 **2 到 4 个小时**。
*   **建议顺序**: 强烈建议**先进行 React Context 的优化，再进行 TypeScript 的迁移**。因为 Context 会移除大量的 props，从而极大简化后续为组件添加类型的工作。
