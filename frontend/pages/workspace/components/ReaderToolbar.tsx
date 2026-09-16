import { useState, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';
import {
  BookOpen,
  Columns2,
  History,
  ChevronDown,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  AnalysisLanguage,
  ReaderPreferences,
  WorkspaceDocument,
} from '@/features/reading';
import { cn } from '@/utils/class-name';
import type {
  ReaderLayout,
  WorkspaceDestination,
} from '../useWorkspaceViewState';
import { ReadingSettingsDialog } from './ReadingSettingsDialog';
import {
  ReaderSyncAlert,
  WorkspaceAppActions,
  WorkspaceBrandButton,
  type WorkspaceAppChromeProps,
} from './WorkspaceHeader';

import { ANALYSIS_LANGUAGE_LABELS } from '../analysis-language';

interface ReaderToolbarProps {
  appChrome: WorkspaceAppChromeProps;
  activeDocument: WorkspaceDocument;
  preferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
  destination: WorkspaceDestination;
  readerLayout: ReaderLayout;
  isDesktopViewport: boolean;
  isSessionsNavigationPinned: boolean;
  onPreferenceChange: <Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => void;
  onAnalysisLanguageChange: (language: AnalysisLanguage) => void;
  onReaderLayoutChange: (layout: ReaderLayout) => void;
  onOpenHistory: () => void;
  onClearDocument: () => void;
  onOpenLibrary: () => void;
  onRenameDocument: (title: string) => void;
}

const LAYOUT_OPTIONS = [
  { icon: PanelLeft, label: 'Show source only', value: 'source' },
  { icon: Columns2, label: 'Show source and analysis', value: 'split' },
  { icon: PanelRight, label: 'Show analysis only', value: 'analysis' },
] satisfies Array<{
  icon: typeof PanelLeft;
  label: string;
  value: ReaderLayout;
}>;

function ReaderLayoutControl({
  destination,
  readerLayout,
  isDesktopViewport,
  onReaderLayoutChange,
}: Pick<
  ReaderToolbarProps,
  'destination' | 'readerLayout' | 'isDesktopViewport' | 'onReaderLayoutChange'
>): ReactElement {
  const options = isDesktopViewport
    ? LAYOUT_OPTIONS
    : LAYOUT_OPTIONS.filter((option) => option.value !== 'split');

  return (
    <div
      className="flex shrink-0 border border-border/40 bg-background"
      role="group"
      aria-label="Reader layout"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = destination === 'reader' && readerLayout === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={isActive}
            title={option.label}
            className={cn(
              'flex h-11 w-10 touch-manipulation items-center justify-center border-e border-border/30 sm:h-10 last:border-e-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              isActive ? 'bg-secondary/40 text-foreground shadow-[inset_0_-2px_0_var(--border)]' : 'bg-card hover:bg-secondary/40',
            )}
            onClick={() => onReaderLayoutChange(option.value)}
          >
            <Icon className="h-4 w-4" strokeWidth={isActive ? 2 : 1.5} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

function EditableDocumentTitle({
  document,
  onRename,
}: {
  document: WorkspaceDocument;
  onRename: (title: string) => void;
}): ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(document.title);

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    if (!draftTitle.trim()) return;
    onRename(draftTitle);
    setIsEditing(false);
  };

  const cancelRename = () => {
    setDraftTitle(document.title);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') cancelRename();
  };

  if (isEditing) {
    return (
      <form className="min-w-0 flex-1" onSubmit={submitRename}>
        <input
          autoFocus
          aria-label="Document title"
          value={draftTitle}
          maxLength={160}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-10 w-full max-w-[42ch] border-2 border-border bg-input px-2 text-base font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>
    );
  }

  return (
    <button
      type="button"
      className="group flex min-w-0 flex-1 items-center gap-1.5 text-left"
      aria-label={`Rename ${document.title}`}
      onClick={() => setIsEditing(true)}
    >
      <span className="max-w-full truncate text-sm font-black sm:max-w-[42ch] sm:text-base" title={document.title}>
        {document.title}
      </span>
      <Pencil className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
    </button>
  );
}

function ReadingSettingsMenu({
  preferences, onPreferenceChange, analysisLanguage, onAnalysisLanguageChange,
}: Pick<ReaderToolbarProps, 'preferences' | 'onPreferenceChange' | 'analysisLanguage' | 'onAnalysisLanguageChange'>): ReactElement {
  const languageLabel = ANALYSIS_LANGUAGE_LABELS[analysisLanguage];
  return (
    <ReadingSettingsDialog
      preferences={preferences}
      onPreferenceChange={onPreferenceChange}
      analysisLanguage={analysisLanguage}
      onAnalysisLanguageChange={onAnalysisLanguageChange}
    >
      <Button
        type="button" variant="outline"
        className="h-11 gap-1.5 border border-border/40 px-2 shadow-none hover:shadow-none active:translate-none sm:h-10 sm:px-3"
        aria-label={`Reading settings, AI output language: ${languageLabel}`}
      >
        Reading <span className="font-normal text-muted-foreground">·</span>
        <span className="font-normal text-muted-foreground sm:hidden">{analysisLanguage === 'zh' ? '中文' : analysisLanguage.toUpperCase()}</span>
        <span className="hidden font-normal text-muted-foreground sm:inline">{languageLabel}</span>
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </ReadingSettingsDialog>
  );
}

export function ReaderToolbar({
  appChrome,
  activeDocument,
  preferences,
  analysisLanguage,
  destination,
  readerLayout,
  isDesktopViewport,
  isSessionsNavigationPinned,
  onPreferenceChange,
  onAnalysisLanguageChange,
  onReaderLayoutChange,
  onOpenHistory,
  onClearDocument,
  onOpenLibrary,
  onRenameDocument,
}: ReaderToolbarProps): ReactElement {
  return (
    <header className="@container z-20 shrink-0 border-b-2 border-border bg-card px-3 py-2 sm:px-4">
      <div
        className="mx-auto grid max-w-[1800px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 font-mono @min-[900px]:grid-cols-[minmax(0,1fr)_auto_auto]"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <WorkspaceBrandButton compact />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 border-0 hover:shadow-none active:translate-none"
            aria-label={isSessionsNavigationPinned
              ? 'Collapse sessions sidebar'
              : 'Open reading sessions'}
            title={isSessionsNavigationPinned ? 'Collapse sessions' : 'Reading sessions'}
            onClick={onOpenLibrary}
          >
            {isSessionsNavigationPinned ? (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            ) : (
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <EditableDocumentTitle
            key={activeDocument.id}
            document={activeDocument}
            onRename={onRenameDocument}
          />
        </div>
        <div className="order-3 col-span-2 flex items-center justify-between gap-1 border-t border-border/20 pt-2 @min-[900px]:order-2 @min-[900px]:col-span-1 @min-[900px]:gap-3 @min-[900px]:border-0 @min-[900px]:pt-0">
          <ReaderLayoutControl
            destination={destination}
            readerLayout={readerLayout}
            isDesktopViewport={isDesktopViewport}
            onReaderLayoutChange={onReaderLayoutChange}
          />
          <Button
            type="button"
            variant={destination === 'history' ? 'secondary' : 'ghost'}
            className="h-11 border-0 px-2 shadow-none hover:shadow-none active:translate-none sm:h-10"
            aria-label="History"
            aria-pressed={destination === 'history'}
            onClick={onOpenHistory}
          >
            <History className="hidden h-4 w-4 sm:block" aria-hidden="true" />
            <span>History</span>
          </Button>
          <ReadingSettingsMenu
            preferences={preferences}
            onPreferenceChange={onPreferenceChange}
            analysisLanguage={analysisLanguage}
            onAnalysisLanguageChange={onAnalysisLanguageChange}
          />
        </div>
        <div className="order-2 border-s border-border/30 ps-2 @min-[900px]:order-3 @min-[900px]:ps-3">
          <WorkspaceAppActions
            {...appChrome}
            compact
            onStartNewDocument={onClearDocument}
          />
        </div>
      </div>
      <ReaderSyncAlert viewModel={appChrome.viewModel} onRetry={appChrome.onRetryCloudSync} />
    </header>
  );
}
