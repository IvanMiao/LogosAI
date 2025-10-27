import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Brain, Menu, Settings, Info } from 'lucide-react';

export function Header({ mounted, activeView, onViewChange }) {
  return (
    <header className={`mb-8 transition-all duration-800 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => onViewChange('home')}
            className="flex items-center gap-4 group transition-opacity hover:opacity-80 p-0 border-0 bg-transparent text-left"
          >
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                LogosAI
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">Advanced Text Analysis Platform</p>
            </div>
          </button>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs px-3 py-1 border-slate-300 text-slate-700">
              v1.0
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors">
                  <Menu className="w-5 h-5 text-slate-700" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => onViewChange('settings')}
                  className="gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onViewChange('about')}
                  className="gap-2 cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                  <span>About</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
