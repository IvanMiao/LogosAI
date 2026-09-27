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
  readingMenuItems?: ReactElement;
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
      <span className={cn("flex shrink-0 items-center justify-center border-2 border-border bg-primary", compact ? "h-8 w-8 shadow-[2px_2px_0px_0px_var(--border)]" : "h-10 w-10 shadow-[4px_4px_0px_0px_var(--border)]")}>
        <Brain className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className={compact ? 'hidden min-w-0 @min-[1100px]:block' : 'min-w-0'}>
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
  readingMenuItems,
}: WorkspaceAppActionsProps): ReactElement {
  const navigate = useNavigate();
  const signOut = async () => {
    await onSignOut();
    navigate('/');
  };

  return (
    <div className={cn('flex shrink-0 items-center font-mono', compact ? 'gap-0 @min-[900px]:gap-2' : 'gap-2')}>
      <WorkspaceStatusActions
        viewModel={viewModel} onRetryCloudSync={onRetryCloudSync}
        compact={compact} showApiKeyShortcut={showApiKeyShortcut}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Open app menu"
            variant={compact ? "ghost" : "secondary"}
            size="icon"
            className={cn("h-10 w-10", compact && "h-11 w-11 border-0 shadow-none hover:shadow-none active:translate-none")}
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-64 overflow-y-auto">
          {readingMenuItems}
          <AppMenuIdentity
            userName={userName} userEmail={userEmail} compact={compact}
            viewModel={viewModel} onRetryCloudSync={onRetryCloudSync}
          />
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

function WorkspaceStatusActions({
  viewModel, onRetryCloudSync, compact, showApiKeyShortcut,
}: Pick<WorkspaceAppActionsProps, 'viewModel' | 'onRetryCloudSync'> & {
  compact: boolean;
  showApiKeyShortcut: boolean;
}): ReactElement {
  return (
    <>
      <span className={compact ? 'hidden @min-[900px]:inline-flex' : 'inline-flex'}>
        <CloudSyncIndicator
          label={viewModel.cloudSyncLabel} tone={viewModel.cloudSyncTone}
          onRetry={onRetryCloudSync} compact={compact}
        />
      </span>
      {showApiKeyShortcut && (!compact || viewModel.apiKeyStatusTone === 'missing') ? (
        <ApiKeyShortcutButton viewModel={viewModel} compact={compact} />
      ) : null}
    </>
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
        compact ? 'hidden @min-[900px]:inline-flex' : '',
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
  compact = false,
}: {
  label: string;
  tone: WorkspaceViewModel['cloudSyncTone'];
  onRetry: () => void;
  compact?: boolean;
}): ReactElement {
  if (compact) {
    return <CompactSyncIndicator label={label} tone={tone} />;
  }
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
      {tone === 'conflict' ? <CloudOff className="h-4 w-4" aria-hidden="true" /> : tone === 'saved'
        ? <Check className="h-4 w-4" aria-hidden="true" />
        : <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
    </span>
  );
}

function CompactSyncIndicator({ label, tone }: {
  label: string;
  tone: WorkspaceViewModel['cloudSyncTone'];
}): ReactElement {
  const isUnavailable = tone === 'offline' || tone === 'error' || tone === 'conflict';
  const Icon = isUnavailable ? CloudOff : tone === 'saved' ? Check : LoaderCircle;
  const isPending = tone === 'saving' || tone === 'loading';
  return (
    <span role="status" aria-label={label} title={label} className="flex h-11 w-5 items-center justify-center text-muted-foreground">
      <Icon className={cn('h-4 w-4', isPending && 'motion-safe:animate-spin')} aria-hidden="true" />
    </span>
  );
}

export function ReaderSyncAlert({ viewModel, onRetry }: {
  viewModel: WorkspaceViewModel;
  onRetry: () => void;
}): ReactElement | null {
  const tone = viewModel.cloudSyncTone;
  if (tone !== 'offline' && tone !== 'error') return null;
  return (
    <div role="alert" className="mt-2 flex items-center justify-between gap-3 border-t border-border/30 pt-2 font-sans text-sm text-error-foreground">
      <span>{tone === 'offline' ? 'You are offline. Cloud sync is paused.' : 'Cloud sync failed.'}</span>
      <Button type="button" variant="outline" size="sm" className="shrink-0 shadow-none" onClick={onRetry}>Retry sync</Button>
    </div>
  );
}

function AppMenuIdentity({ userName, userEmail, compact, viewModel, onRetryCloudSync }: Pick<WorkspaceAppActionsProps,
  'userName' | 'userEmail' | 'compact' | 'viewModel' | 'onRetryCloudSync'
>): ReactElement {
  const hasSyncError = viewModel.cloudSyncTone === 'offline' || viewModel.cloudSyncTone === 'error';
  return <>
    <DropdownMenuLabel className="truncate">
      {userName || userEmail}
      {userEmail ? <span className="mt-0.5 block truncate font-normal">{userEmail}</span> : null}
    </DropdownMenuLabel>
    {compact && viewModel.apiKeyStatusTone === 'missing' ? <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
      Gemini API key missing
    </DropdownMenuLabel> : null}
    {compact && hasSyncError ? (
      <>
        <DropdownMenuLabel role="status" className="text-xs font-normal text-muted-foreground">
          {viewModel.cloudSyncTone === 'offline' ? 'Cloud sync is paused.' : 'Cloud sync failed.'}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={onRetryCloudSync} className="gap-2">
          <CloudOff className="h-4 w-4" aria-hidden="true" />
          <span>Retry sync</span>
        </DropdownMenuItem>
      </>
    ) : null}
  </>;
}
