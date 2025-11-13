import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { SettingsView } from '@/components/SettingsView';
import { AboutView } from '@/components/AboutView';
import { AnalysisProvider, useAnalysisContext } from '@/hooks/AnalysisContext';

import './App.css';


function AppWrapper() {
  const [mounted, setMounted] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const { fetchHistory } = useAnalysisContext();

  useEffect(() => {
    setMounted(true);
    fetchHistory();
  }, []);

  const viewComponents = {
    home: (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalysisPanel />
        </div>
        <div className="lg:col-span-1">
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

        <main className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {viewComponents[activeView]}
        </main>
      </div>
    </div>
  );
}


function App() {
  return (
    <AnalysisProvider>
      <AppWrapper />
    </AnalysisProvider>
  );
}

export default App;
