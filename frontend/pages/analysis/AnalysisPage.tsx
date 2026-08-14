import { AnalysisPanel } from '@/components/AnalysisPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { useAuth } from '@/features/auth';
import { useUserSettings } from '@/features/user-settings';
import type { AnalysisModel } from '@/types';
import { useAnalysisPage } from './useAnalysisPage';

export interface AnalysisPageProps {
  hasApiKey: boolean;
  model: AnalysisModel;
  userId?: string;
}

export function AuthenticatedAnalysisPage() {
  const auth = useAuth();
  const settings = useUserSettings();
  if (!auth.user) {
    throw new Error('AuthenticatedAnalysisPage requires an authenticated user.');
  }
  return (
    <AnalysisPage
      userId={auth.user.id}
      hasApiKey={settings.hasApiKey}
      model={settings.model}
    />
  );
}

export function AnalysisPage({ hasApiKey, model, userId }: AnalysisPageProps) {
  const analysisPage = useAnalysisPage({
    hasApiKey,
    model,
    userId,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <AnalysisPanel
          text={analysisPage.text}
          setText={analysisPage.setText}
          language={analysisPage.language}
          setLanguage={analysisPage.setLanguage}
          result={analysisPage.result}
          isLoading={analysisPage.isLoading}
          streamStage={analysisPage.streamStage}
          error={analysisPage.error}
          hasApiKey={hasApiKey}
          onAnalyze={analysisPage.onAnalyze}
        />
      </div>
      <div className="lg:col-span-1">
        <HistoryPanel
          history={analysisPage.history}
          onLoadHistory={analysisPage.onLoadHistory}
          onDeleteHistory={analysisPage.onDeleteHistory}
        />
      </div>
    </div>
  );
}
