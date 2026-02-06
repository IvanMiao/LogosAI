import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAnalysisContext } from '@/hooks/AnalysisContext';

export function Layout() {
  const [mounted, setMounted] = useState<boolean>(false);
  const { fetchHistory } = useAnalysisContext();

  useEffect(() => {
    setMounted(true);
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Header mounted={mounted} />

        <main className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
