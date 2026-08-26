import { useState, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';
import {
  BookOpen,
  Columns2,
  History,
  Languages,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AnalysisLanguage,
  ReaderPreferences,
  WorkspaceDocument,
} from '@/features/reading';
import { cn } from '@/utils/class-name';
import { formatDocumentMeta } from '@/features/reading/reading-core';
import type {
  ReaderLayout,
  WorkspaceDestination,
} from '../useWorkspaceViewState';
import { ReadingAppearanceDialog } from './ReadingAppearanceDialog';
import {
  WorkspaceAppActions,
  WorkspaceBrandButton,
  type WorkspaceAppChromeProps,
} from './WorkspaceHeader';

const ANALYSIS_LANGUAGE_OPTIONS: Array<{ label: string; value: AnalysisLanguage }> = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
  { label: 'Français', value: 'fr' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Español', value: 'es' },
  { label: 'Italiano', value: 'it' },
  { label: '日本語', value: 'ja' },
];

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
      className="flex shrink-0 border-2 border-border bg-background"
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
              'flex h-10 w-10 touch-manipulation items-center justify-center border-e-2 border-border last:border-e-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              isActive ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-secondary/40',
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

function AnalysisLanguageSelect({
  language,
  onLanguageChange,
}: {
  language: AnalysisLanguage;
  onLanguageChange: (language: AnalysisLanguage) => void;
}): ReactElement {
  return (
    <div className="flex items-center gap-2">
      <Languages className="hidden h-4 w-4 sm:block" aria-hidden="true" />
      <Select
        value={language}
        onValueChange={(value) => onLanguageChange(value as AnalysisLanguage)}
      >
        <SelectTrigger
          aria-label="Analysis language"
          title="Analysis language"
          className="h-10 w-24 bg-card sm:w-28"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ANALYSIS_LANGUAGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ReadingSettingsMenu({
  preferences,
  onPreferenceChange,
}: Pick<ReaderToolbarProps, 'preferences' | 'onPreferenceChange'>): ReactElement {
  return (
    <ReadingAppearanceDialog
      preferences={preferences}
      onPreferenceChange={onPreferenceChange}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10"
        aria-label="Reading appearance"
        title="Reading appearance"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      </Button>
    </ReadingAppearanceDialog>
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
    <header className="z-20 shrink-0 border-b-2 border-border bg-card px-3 py-1 sm:px-4">
      <div
        className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-2 font-mono lg:flex-nowrap lg:justify-between"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <WorkspaceBrandButton compact />
          <span aria-hidden="true" className="h-8 border-e-2 border-border" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
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
          <span aria-hidden="true" className="hidden text-muted-foreground md:inline">·</span>
          <p className="hidden shrink-0 text-xs tabular-nums text-muted-foreground 2xl:block">
            {formatDocumentMeta(activeDocument)}
          </p>
        </div>
        <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:ms-auto sm:w-auto sm:justify-end">
          <ReaderLayoutControl
            destination={destination}
            readerLayout={readerLayout}
            isDesktopViewport={isDesktopViewport}
            onReaderLayoutChange={onReaderLayoutChange}
          />
          <Button
            type="button"
            variant={destination === 'history' ? 'default' : 'outline'}
            className="h-10 px-3"
            aria-label="History"
            aria-pressed={destination === 'history'}
            onClick={onOpenHistory}
          >
            <History className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">History</span>
          </Button>
          <AnalysisLanguageSelect
            language={analysisLanguage}
            onLanguageChange={onAnalysisLanguageChange}
          />
          <ReadingSettingsMenu
            preferences={preferences}
            onPreferenceChange={onPreferenceChange}
          />
          <WorkspaceAppActions
            {...appChrome}
            compact
            onStartNewDocument={onClearDocument}
          />
        </div>
      </div>
    </header>
  );
}
