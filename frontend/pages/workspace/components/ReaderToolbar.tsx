import { useState, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';
import {
  BookOpen,
  Eraser,
  FileText,
  History,
  Languages,
  PanelLeftClose,
  Pencil,
  ScanText,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/utils/className';
import { formatDocumentMeta } from '@/features/reading/reading-core';
import type { WorkspaceMode } from '../useWorkspaceViewState';
import { ReadingAppearanceDialog } from './ReadingAppearanceDialog';

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
  activeDocument: WorkspaceDocument;
  preferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
  mode: WorkspaceMode;
  isSessionsNavigationPinned: boolean;
  onPreferenceChange: <Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => void;
  onAnalysisLanguageChange: (language: AnalysisLanguage) => void;
  onModeChange: (mode: WorkspaceMode) => void;
  onClearDocument: () => void;
  onOpenLibrary: () => void;
  onRenameDocument: (title: string) => void;
}

const MODE_OPTIONS = [
  { icon: FileText, label: 'Text', value: 'text' },
  { icon: ScanText, label: 'Close Reading', value: 'close-reading' },
  { icon: History, label: 'History', value: 'history' },
] satisfies Array<{
  icon: typeof FileText;
  label: string;
  value: WorkspaceMode;
}>;

function WorkspaceModeNavigation({
  mode,
  onModeChange,
}: Pick<ReaderToolbarProps, 'mode' | 'onModeChange'>): ReactElement {
  return (
    <div
      className="order-3 grid w-full grid-cols-3 border-2 border-border bg-background sm:order-none sm:w-auto"
      role="group"
      aria-label="Workspace mode"
    >
      {MODE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            className={cn(
              'flex min-h-11 items-center justify-center gap-2 border-e-2 border-border px-3 text-xs font-black last:border-e-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-secondary/40',
            )}
            onClick={() => onModeChange(option.value)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{option.label}</span>
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
          className="h-11 w-full max-w-[42ch] border-2 border-border bg-input px-2 text-base font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="h-11 w-24 bg-card sm:w-28"
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
        className="h-11 w-11"
        aria-label="Reading appearance"
        title="Reading appearance"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      </Button>
    </ReadingAppearanceDialog>
  );
}

export function ReaderToolbar({
  activeDocument,
  preferences,
  analysisLanguage,
  mode,
  isSessionsNavigationPinned,
  onPreferenceChange,
  onAnalysisLanguageChange,
  onModeChange,
  onClearDocument,
  onOpenLibrary,
  onRenameDocument,
}: ReaderToolbarProps): ReactElement {
  return (
    <div className="sticky top-0 z-20 border-b-2 border-border bg-card px-3 py-1.5 shadow-[0_4px_0px_0px_var(--border)] sm:px-4">
      <div
        className={cn(
          'mx-auto flex flex-wrap items-center gap-2 font-mono sm:flex-nowrap sm:justify-between sm:gap-3',
          mode === 'close-reading' ? 'max-w-[1600px]' : 'max-w-[1500px]',
        )}
      >
        <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden sm:flex-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
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
          <p className="hidden shrink-0 text-xs text-muted-foreground md:block">
            {formatDocumentMeta(activeDocument)}
          </p>
        </div>
        <WorkspaceModeNavigation mode={mode} onModeChange={onModeChange} />
        <div className="flex w-full shrink-0 items-center justify-between gap-1.5 sm:w-auto sm:justify-end sm:gap-2">
          <AnalysisLanguageSelect
            language={analysisLanguage}
            onLanguageChange={onAnalysisLanguageChange}
          />
          <ReadingSettingsMenu
            preferences={preferences}
            onPreferenceChange={onPreferenceChange}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                aria-label="Document menu"
              >
                <span className="text-lg leading-none">•••</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onClearDocument} className="gap-2">
                <Eraser className="h-4 w-4" />
                <span>New document</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
