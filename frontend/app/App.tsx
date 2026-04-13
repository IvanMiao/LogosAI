import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AboutPage } from '@/pages/about';
import { AnalysisPage } from '@/pages/analysis';
import { LandingPage } from '@/pages/landing';
import { SettingsPage, useSettingsPage } from '@/pages/settings';
import { AppLayout } from './AppLayout';

export function App() {
  const settings = useSettingsPage();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AppLayout />}>
          <Route
            index
            element={(
              <AnalysisPage
                apiKey={settings.savedApiKey}
                hasApiKey={settings.hasApiKey}
                model={settings.model}
              />
            )}
          />
          <Route path="settings" element={<SettingsPage settings={settings} />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
