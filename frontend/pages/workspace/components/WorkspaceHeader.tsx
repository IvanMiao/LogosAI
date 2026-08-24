import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Check,
  CloudOff,
  FileText,
  History,
  Info,
  KeyRound,
  LoaderCircle,
  LogOut,
  Menu,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/class-name';
import type { WorkspaceViewModel } from '../workspace-types';

interface WorkspaceHeaderProps {
  viewModel: WorkspaceViewModel;
  userName: string;
  userEmail: string;
  onSignOut: () => Promise<void>;
  onOpenLibrary: () => void;
  onRetryCloudSync: () => void;
}

export function WorkspaceHeader({
  viewModel,
  userName,
  userEmail,
  onSignOut,
  onOpenLibrary,
  onRetryCloudSync,
}: WorkspaceHeaderProps): ReactElement {
  const navigate = useNavigate();
  const apiKeyClassName = cn(
    'h-11 w-11',
    viewModel.apiKeyStatusTone === 'ready' ? 'bg-secondary' : 'bg-accent',
  );
  const signOut = async () => {
    await onSignOut();
    navigate('/');
  };

  return (
    <header className="border-b-2 border-border bg-background px-3 py-3 font-mono sm:px-4">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 border-2 border-border bg-card px-3 shadow-[4px_4px_0px_0px_var(--border)] sm:px-4">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary shadow-[4px_4px_0px_0px_var(--border)]">
            <Brain className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-brand text-lg font-black leading-tight">LogosAI</span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:block">
              Reading Workspace
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <CloudSyncIndicator
            label={viewModel.cloudSyncLabel}
            tone={viewModel.cloudSyncTone}
            onRetry={onRetryCloudSync}
          />
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
              <Button aria-label="Open app menu" variant="secondary" size="icon" className="h-11 w-11">
                <Menu className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">
                {userName || userEmail}
                {userEmail ? <span className="mt-0.5 block truncate font-normal">{userEmail}</span> : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenLibrary} className="gap-2">
                <History className="h-4 w-4" aria-hidden="true" />
                <span>Reading sessions</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/settings')} className="gap-2">
                <Settings className="h-4 w-4" aria-hidden="true" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/about')} className="gap-2">
                <Info className="h-4 w-4" aria-hidden="true" />
                <span>About</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/app/analysis')} className="gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>Legacy analysis</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void signOut()} className="gap-2 text-error-foreground">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function CloudSyncIndicator({
  label,
  tone,
  onRetry,
}: {
  label: string;
  tone: WorkspaceViewModel['cloudSyncTone'];
  onRetry: () => void;
}): ReactElement {
  if (tone === 'offline' || tone === 'error') {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 bg-accent"
        aria-label={label}
        title={label}
        onClick={onRetry}
      >
        <CloudOff className="h-4 w-4" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center border-2 border-border bg-card"
    >
      {tone === 'saved'
        ? <Check className="h-4 w-4" aria-hidden="true" />
        : <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
    </span>
  );
}
