import { useState, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';
import {
  BookOpen,
  Check,
  Eraser,
  Languages,
  PanelRight,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  ReaderFontFamily,
  ReaderPreferences,
  WorkspaceDocument,
} from '@/features/reading';
import { cn } from '@/utils/className';
import { formatDocumentMeta } from '../workspace.helpers';
import type { WorkspaceController } from '../workspace.types';

const ANALYSIS_LANGUAGE_OPTIONS: Array<{ label: string; value: AnalysisLanguage }> = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
  { label: 'Français', value: 'fr' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Español', value: 'es' },
  { label: 'Italiano', value: 'it' },
  { label: '日本語', value: 'ja' },
];

const FONT_OPTIONS: Array<{ label: string; value: ReaderFontFamily }> = [
  { label: 'Serif', value: 'serif' },
  { label: 'Sans', value: 'sans' },
  { label: 'Mono', value: 'mono' },
];

const SIZE_OPTIONS = [
  { label: 'Small', value: 16 },
  { label: 'Medium', value: 18 },
  { label: 'Large', value: 20 },
];

const SPACING_OPTIONS = [
  { label: 'Compact', value: 1.5 },
  { label: 'Comfortable', value: 1.75 },
  { label: 'Loose', value: 2 },
];

interface ReaderToolbarProps {
  activeDocument: WorkspaceDocument;
  preferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
  isContextPanelOpen: boolean;
  isDeepReadingOpen: boolean;
  onPreferenceChange: WorkspaceController['updateReaderPreference'];
  onAnalysisLanguageChange: WorkspaceController['updateAnalysisLanguage'];
  onContextPanelToggle: () => void;
  onClearDocument: () => void;
  onOpenLibrary: () => void;
  onRenameDocument: (title: string) => void;
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

interface PreferenceItemProps {
  accessibleLabel: string;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
}

function PreferenceItem({
  accessibleLabel,
  isSelected,
  label,
  onSelect,
}: PreferenceItemProps): ReactElement {
  return (
    <DropdownMenuItem
      aria-label={accessibleLabel}
      className="justify-between"
      onSelect={(event) => {
        event.preventDefault();
        onSelect();
      }}
    >
      <span>{label}</span>
      {isSelected ? <Check className="h-4 w-4" /> : null}
    </DropdownMenuItem>
  );
}

interface FontPreferenceItemsProps {
  accessiblePrefix: string;
  heading: string;
  selectedFont: ReaderFontFamily;
  onSelectFont: (fontFamily: ReaderFontFamily) => void;
}

function FontPreferenceItems({
  accessiblePrefix,
  heading,
  selectedFont,
  onSelectFont,
}: FontPreferenceItemsProps): ReactElement {
  return (
    <>
      <p className="px-2 py-1 text-xs font-black uppercase tracking-wide text-muted-foreground">
        {heading}
      </p>
      {FONT_OPTIONS.map((option) => (
        <PreferenceItem
          key={option.value}
          accessibleLabel={`${accessiblePrefix}: ${option.label}`}
          label={option.label}
          isSelected={selectedFont === option.value}
          onSelect={() => onSelectFont(option.value)}
        />
      ))}
    </>
  );
}

function ReadingSettingsMenu({
  preferences,
  onPreferenceChange,
}: Pick<ReaderToolbarProps, 'preferences' | 'onPreferenceChange'>): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11"
          aria-label="Reading settings"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <FontPreferenceItems
          accessiblePrefix="Source font"
          heading="Source font"
          selectedFont={preferences.fontFamily}
          onSelectFont={(fontFamily) => onPreferenceChange('fontFamily', fontFamily)}
        />
        <DropdownMenuSeparator />
        <FontPreferenceItems
          accessiblePrefix="Close Reading font"
          heading="Close Reading font"
          selectedFont={preferences.closeReadingFontFamily}
          onSelectFont={(fontFamily) => (
            onPreferenceChange('closeReadingFontFamily', fontFamily)
          )}
        />
        <DropdownMenuSeparator />
        <p className="px-2 py-1 text-xs font-black uppercase tracking-wide text-muted-foreground">Size</p>
        {SIZE_OPTIONS.map((option) => (
          <PreferenceItem
            key={option.value}
            accessibleLabel={`Text size: ${option.label}`}
            label={option.label}
            isSelected={preferences.fontSize === option.value}
            onSelect={() => onPreferenceChange('fontSize', option.value)}
          />
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1 text-xs font-black uppercase tracking-wide text-muted-foreground">Spacing</p>
        {SPACING_OPTIONS.map((option) => (
          <PreferenceItem
            key={option.value}
            accessibleLabel={`Line spacing: ${option.label}`}
            label={option.label}
            isSelected={preferences.lineSpacing === option.value}
            onSelect={() => onPreferenceChange('lineSpacing', option.value)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ReaderToolbar({
  activeDocument,
  preferences,
  analysisLanguage,
  isContextPanelOpen,
  isDeepReadingOpen,
  onPreferenceChange,
  onAnalysisLanguageChange,
  onContextPanelToggle,
  onClearDocument,
  onOpenLibrary,
  onRenameDocument,
}: ReaderToolbarProps): ReactElement {
  const panelButtonLabel = isContextPanelOpen ? 'Close context panel' : 'Open context panel';

  return (
    <div className="sticky top-0 z-20 border-b-2 border-border bg-card px-3 py-1.5 shadow-[0_4px_0px_0px_var(--border)] sm:px-4">
      <div
        className={cn(
          'mx-auto flex flex-wrap items-center gap-2 font-mono sm:flex-nowrap sm:justify-between sm:gap-3',
          isDeepReadingOpen ? 'max-w-[1600px]' : 'max-w-7xl',
        )}
      >
        <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden sm:flex-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Open reading sessions"
            title="Reading sessions"
            onClick={onOpenLibrary}
          >
            <BookOpen className="h-4 w-4" />
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
        <div className="flex w-full shrink-0 items-center justify-between gap-1.5 sm:w-auto sm:justify-end sm:gap-2">
          <AnalysisLanguageSelect
            language={analysisLanguage}
            onLanguageChange={onAnalysisLanguageChange}
          />
          <ReadingSettingsMenu
            preferences={preferences}
            onPreferenceChange={onPreferenceChange}
          />
          <Button
            type="button"
            variant="outline"
            className={cn('h-11 w-11', isContextPanelOpen ? 'bg-secondary' : '')}
            size="icon"
            aria-label={panelButtonLabel}
            title={panelButtonLabel}
            onClick={onContextPanelToggle}
          >
            <PanelRight className={cn('h-4 w-4', isContextPanelOpen ? '' : 'opacity-70')} />
          </Button>
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
