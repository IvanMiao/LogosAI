import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { SettingsView } from '@/components/SettingsView';
import { AboutView } from '@/components/AboutView';
import { useAnalysis } from '@/hooks/useAnalysis';
import './App.css';

function App() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const {
    text,
    setText,
    language,
    setLanguage,
    result,
    history,
    isLoading,
    error,
    fetchHistory,
    handleAnalyze,
    handleDeleteHistory,
    handleLoadHistory,
  } = useAnalysis();

  useEffect(() => {
    setMounted(true);
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Header mounted={mounted} activeView={activeView} onViewChange={setActiveView} />

        <main className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {activeView === 'home' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AnalysisPanel
                  text={text}
                  setText={setText}
                  language={language}
                  setLanguage={setLanguage}
                  result={result}
                  isLoading={isLoading}
                  error={error}
                  onAnalyze={handleAnalyze}
                />
              </div>

              <div className="lg:col-span-1">
                <HistoryPanel
                  history={history}
                  onLoadHistory={handleLoadHistory}
                  onDeleteHistory={handleDeleteHistory}
                />
              </div>
            </div>
          )}

          {activeView === 'settings' && <SettingsView />}
          {activeView === 'about' && <AboutView />}
        </main>
      </div>
    </div>
  );
}

export default App;
