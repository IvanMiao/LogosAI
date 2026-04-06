import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/components/HomePage';
import { SettingsView } from '@/components/SettingsView';
import { AboutView } from '@/components/AboutView';
import { NotebookView } from '@/components/NotebookView';
import { LandingPage } from '@/components/LandingPage';
import { AnalysisProvider } from '@/context/AnalysisContext';
import { SettingsProvider } from '@/context/SettingsContext';

import './App.css';

function App() {
  return (
    <SettingsProvider>
      <AnalysisProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="notebook" element={<NotebookView />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="about" element={<AboutView />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AnalysisProvider>
    </SettingsProvider>
  );
}

export default App;
