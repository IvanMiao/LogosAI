import { AnalysisPanel } from '@/components/AnalysisPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import type { AnalysisModel } from '@/types';
import { useAnalysisPage } from './useAnalysisPage';

export interface AnalysisPageProps {
  apiKey: string;
  hasApiKey: boolean;
  model: AnalysisModel;
}

export function AnalysisPage({
  apiKey,
  hasApiKey,
  model,
}: AnalysisPageProps) {
  const analysisPage = useAnalysisPage({ apiKey, hasApiKey, model });

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
