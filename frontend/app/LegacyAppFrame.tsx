import { useEffect, useState, type ReactNode } from 'react';
import { Header } from '@/components/Header';

interface LegacyAppFrameProps {
  children: ReactNode;
}

export function LegacyAppFrame({ children }: LegacyAppFrameProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="p-3 sm:p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Header mounted={mounted} />
        <main
          data-route-focus
          tabIndex={-1}
          className={`transition-[opacity,transform] duration-1000 delay-300 motion-reduce:transition-none ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
