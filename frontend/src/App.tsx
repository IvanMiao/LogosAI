import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/components/HomePage';
import { SettingsView } from '@/components/SettingsView';
import { AboutView } from '@/components/AboutView';
import { AnalysisProvider } from '@/hooks/AnalysisContext';

import './App.css';

function App() {
  return (
    <AnalysisProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/about" element={<AboutView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AnalysisProvider>
  );
}

export default App;
