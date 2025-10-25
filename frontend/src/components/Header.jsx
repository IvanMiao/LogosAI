import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';

export function Header({ mounted }) {
  return (
    <header className={`mb-8 transition-all duration-800 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                LogosAI
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">Advanced Text Analysis Platform</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs px-3 py-1 border-slate-300 text-slate-700">
            v1.0
          </Badge>
        </div>
      </div>
    </header>
  );
}
