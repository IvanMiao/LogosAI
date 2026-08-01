import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  FileText,
  History,
  Info,
  KeyRound,
  Menu,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/className';
import type { WorkspaceViewModel } from '../workspace.types';

interface WorkspaceHeaderProps {
  viewModel: WorkspaceViewModel;
  onOpenHistory: () => void;
}

export function WorkspaceHeader({
  viewModel,
  onOpenHistory,
}: WorkspaceHeaderProps): ReactElement {
  const navigate = useNavigate();
  const apiKeyClassName = cn(
    'h-9 w-9',
    viewModel.apiKeyStatusTone === 'ready' ? 'bg-secondary' : 'bg-accent',
  );

  return (
    <header className="border-b-2 border-border bg-background px-3 py-3 font-mono sm:px-4">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 border-2 border-border bg-card px-3 shadow-[4px_4px_0px_0px_var(--border)] sm:px-4">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="flex min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary shadow-[4px_4px_0px_0px_var(--border)]">
            <Brain className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-black leading-tight">LogosAI</span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:block">
              Reading Workspace
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={apiKeyClassName}
            aria-label={viewModel.apiKeyStatusLabel}
            title={viewModel.apiKeyStatusLabel}
            onClick={() => navigate('/app/settings')}
          >
            <KeyRound className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Open app menu" variant="secondary" size="icon" className="h-9 w-9">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onOpenHistory} className="gap-2">
                <History className="h-4 w-4" />
                <span>History</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/settings')} className="gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/about')} className="gap-2">
                <Info className="h-4 w-4" />
                <span>About</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/analysis')} className="gap-2">
                <FileText className="h-4 w-4" />
                <span>Legacy analysis</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
