
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Brain, Menu, Settings, Info } from 'lucide-react';

interface HeaderProps {
  mounted: boolean;
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Header({ mounted, onViewChange }: HeaderProps) {
  return (
    <header className={`mb-8 transition-all duration-800 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="bg-card border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onViewChange('home')}
            className="flex items-center gap-4 group transition-opacity hover:opacity-80 p-0 border-0 bg-transparent text-left"
          >
            <div className="w-12 h-12 bg-primary border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]">
              <Brain className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight font-mono">
                LogosAI
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5 font-mono">DEEP_TEXT_ANALYSIS</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs px-3 py-1 border-2 border-border text-foreground font-bold bg-accent">
              v1.0
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 border-2 border-border bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                  <Menu className="w-5 h-5 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] rounded-none">
                <DropdownMenuItem
                  onClick={() => onViewChange('settings')}
                  className="gap-2 focus:bg-primary focus:text-primary-foreground rounded-none"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => onViewChange('about')}
                  className="gap-2 focus:bg-primary focus:text-primary-foreground rounded-none"
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
