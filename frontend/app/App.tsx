import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AboutPage } from '@/pages/about';
import { AnalysisPage } from '@/pages/analysis';
import { LandingPage } from '@/pages/landing';
import { SettingsPage, useSettingsPage } from '@/pages/settings';
import { WorkspacePage } from '@/pages/workspace';
import { AppLayout } from './AppLayout';
import { LegacyAppFrame } from './LegacyAppFrame';

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
              <WorkspacePage
                apiKey={settings.savedApiKey}
                hasApiKey={settings.hasApiKey}
                model={settings.model}
              />
            )}
          />
          <Route
            path="analysis"
            element={(
              <LegacyAppFrame>
                <AnalysisPage
                  apiKey={settings.savedApiKey}
                  hasApiKey={settings.hasApiKey}
                  model={settings.model}
                />
              </LegacyAppFrame>
            )}
          />
          <Route
            path="settings"
            element={(
              <LegacyAppFrame>
                <SettingsPage settings={settings} />
              </LegacyAppFrame>
            )}
          />
          <Route
            path="about"
            element={(
              <LegacyAppFrame>
                <AboutPage />
              </LegacyAppFrame>
            )}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
