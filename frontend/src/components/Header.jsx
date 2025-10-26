import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles } from 'lucide-react';

export function Header({ mounted }) {
  return (
    <header className={`mb-8 transition-all duration-800 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="relative bg-gradient-to-br from-white via-white to-slate-50 border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/50 p-6 overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-blue-100 to-cyan-100 rounded-full blur-3xl opacity-40"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 group hover:scale-105 transition-transform duration-300">
              <Brain className="w-8 h-8 text-white" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent tracking-tight">
                  LogosAI
                </h1>
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              </div>
              <p className="text-sm text-slate-600 mt-1">AI-Powered Text Analysis & Insights Platform</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs px-4 py-1.5 border-slate-300 text-slate-700 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300">
            v1.0
          </Badge>
        </div>
      </div>
    </header>
  );
}
