import { AnalysisPanel } from '@/components/AnalysisPanel';
import { HistoryPanel } from '@/components/HistoryPanel';

export function HomePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <AnalysisPanel />
      </div>
      <div className="lg:col-span-1">
        <HistoryPanel />
      </div>
    </div>
  );
}
