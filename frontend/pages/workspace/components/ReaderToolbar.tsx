import type { ReactElement } from 'react';
import { Check, Eraser, Languages, PanelRight, SlidersHorizontal } from 'lucide-react';
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
import { cn } from '@/utils/className';
import { formatDocumentMeta } from '../workspace.helpers';
import type {
  AnalysisLanguage,
  ReaderFontFamily,
  ReaderPreferences,
  WorkspaceController,
  WorkspaceDocument,
} from '../workspace.types';

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
          className="h-9 w-24 bg-card sm:w-28"
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
          className="h-9 w-9"
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
}: ReaderToolbarProps): ReactElement {
  const panelButtonLabel = isContextPanelOpen ? 'Close context panel' : 'Open context panel';

  return (
    <div className="sticky top-0 z-20 border-b-2 border-border bg-card px-3 py-1.5 shadow-[0_4px_0px_0px_var(--border)] sm:px-4">
      <div
        className={cn(
          'mx-auto flex items-center justify-between gap-3 font-mono',
          isDeepReadingOpen ? 'max-w-[1600px]' : 'max-w-7xl',
        )}
      >
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <h1
            className="max-w-[42ch] truncate text-sm font-black sm:text-base"
            title={activeDocument.title}
          >
            {activeDocument.title}
          </h1>
          <span aria-hidden="true" className="hidden text-muted-foreground md:inline">·</span>
          <p className="hidden shrink-0 text-xs text-muted-foreground md:block">
            {formatDocumentMeta(activeDocument)}
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
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
            className={cn('h-9 w-9', isContextPanelOpen ? 'bg-secondary' : '')}
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
                className="h-9 w-9"
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
