import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/components/HomePage';
import { SettingsView } from '@/components/SettingsView';
import { AboutView } from '@/components/AboutView';
import { LandingPage } from '@/components/LandingPage';
import { AnalysisProvider } from '@/hooks/AnalysisContext';

import './App.css';

function App() {
  return (
    <AnalysisProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="about" element={<AboutView />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AnalysisProvider>
  );
}

export default App;
