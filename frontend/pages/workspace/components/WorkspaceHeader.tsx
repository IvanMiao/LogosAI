import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Check,
  CloudOff,
  FileText,
  FilePlus2,
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

export interface WorkspaceAppChromeProps {
  viewModel: WorkspaceViewModel;
  userName: string;
  userEmail: string;
  onSignOut: () => Promise<void>;
  onOpenLibrary: () => void;
  onRetryCloudSync: () => void;
}

interface WorkspaceBrandButtonProps {
  compact?: boolean;
}

interface WorkspaceAppActionsProps extends WorkspaceAppChromeProps {
  compact?: boolean;
  onStartNewDocument?: () => void;
  showApiKeyShortcut?: boolean;
}

export function WorkspaceBrandButton({
  compact = false,
}: WorkspaceBrandButtonProps): ReactElement {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/app')}
      aria-label={compact ? 'LogosAI home' : undefined}
      title={compact ? 'LogosAI home' : undefined}
      className="flex min-h-10 min-w-0 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary shadow-[4px_4px_0px_0px_var(--border)]">
        <Brain className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className={compact ? 'hidden min-w-0 xl:block' : 'min-w-0'}>
        <span className="block truncate font-brand text-lg font-black leading-tight">LogosAI</span>
        {!compact ? (
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:block">
            Reading Workspace
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function WorkspaceAppActions({
  viewModel,
  userName,
  userEmail,
  onSignOut,
  onOpenLibrary,
  onRetryCloudSync,
  compact = false,
  onStartNewDocument,
  showApiKeyShortcut = true,
}: WorkspaceAppActionsProps): ReactElement {
  const navigate = useNavigate();
  const signOut = async () => {
    await onSignOut();
    navigate('/');
  };

  return (
    <div className="flex shrink-0 items-center gap-2 font-mono">
      <span className={compact ? 'hidden sm:inline-flex' : 'inline-flex'}>
        <CloudSyncIndicator
          label={viewModel.cloudSyncLabel}
          tone={viewModel.cloudSyncTone}
          onRetry={onRetryCloudSync}
        />
      </span>
      {showApiKeyShortcut ? (
        <ApiKeyShortcutButton viewModel={viewModel} compact={compact} />
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Open app menu"
            variant="secondary"
            size="icon"
            className="h-10 w-10"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">
            {userName || userEmail}
            {userEmail ? <span className="mt-0.5 block truncate font-normal">{userEmail}</span> : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {onStartNewDocument ? (
            <DropdownMenuItem onClick={onStartNewDocument} className="gap-2">
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              <span>New session</span>
            </DropdownMenuItem>
          ) : null}
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
  );
}

export function WorkspaceHeader(props: WorkspaceAppChromeProps): ReactElement {
  return (
    <header className="border-b-2 border-border bg-background px-3 py-3 font-mono sm:px-4">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 border-2 border-border bg-card px-3 shadow-[4px_4px_0px_0px_var(--border)] sm:px-4">
        <WorkspaceBrandButton />
        <WorkspaceAppActions {...props} />
      </div>
    </header>
  );
}

function ApiKeyShortcutButton({
  viewModel,
  compact,
}: {
  viewModel: WorkspaceViewModel;
  compact: boolean;
}): ReactElement {
  const navigate = useNavigate();
  const isMissing = viewModel.apiKeyStatusTone === 'missing';

  return (
    <Button
      type="button"
      variant="outline"
      size={isMissing && !compact ? 'default' : 'icon'}
      className={cn(
        isMissing ? 'bg-accent' : 'h-10 w-10 bg-secondary',
        compact && !isMissing ? 'hidden sm:inline-flex' : '',
      )}
      aria-label={viewModel.apiKeyStatusLabel}
      title={viewModel.apiKeyStatusLabel}
      onClick={() => navigate('/app/settings')}
    >
      <KeyRound className="h-4 w-4" />
      {isMissing ? (
        <span className={compact ? 'sr-only' : undefined}>Add API key</span>
      ) : null}
    </Button>
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
        className="h-10 w-10 bg-accent"
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
      className="flex h-10 w-10 items-center justify-center border-2 border-border bg-card"
    >
      {tone === 'saved'
        ? <Check className="h-4 w-4" aria-hidden="true" />
        : <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
    </span>
  );
}
