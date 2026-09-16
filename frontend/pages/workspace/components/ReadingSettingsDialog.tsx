import { type ReactElement } from 'react';
import { RotateCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ANALYSIS_LANGUAGE_LABELS } from '../analysis-language';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { AnalysisLanguage, ReaderFontFamily, ReaderPreferences } from '@/features/reading';
import { DEFAULT_READER_PREFERENCES } from '@/features/reading/reading-storage';
import { cn } from '@/utils/class-name';
import { getReaderFontClassName } from '../reading-typography';

const FONT_OPTIONS: Array<{ label: string; sample: string; value: ReaderFontFamily }> = [
  { label: 'Literary', sample: 'Aa 文', value: 'serif' },
  { label: 'Sans', sample: 'Aa 文', value: 'sans' },
  { label: 'Mono', sample: 'Aa 文', value: 'mono' },
];

interface ReadingSettingsDialogProps {
  children: ReactElement;
  preferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
  onAnalysisLanguageChange: (language: AnalysisLanguage) => void;
  onPreferenceChange: <Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => void;
}

function FontPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ReaderFontFamily;
  onChange: (font: ReaderFontFamily) => void;
}): ReactElement {
  return (
    <fieldset>
      <legend className="text-xs font-black uppercase tracking-wide text-muted-foreground">
        {label}
      </legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {FONT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            className={cn(
              'min-h-16 border-2 border-border bg-card p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              value === option.value ? 'bg-secondary shadow-[3px_3px_0px_0px_var(--border)]' : '',
            )}
            onClick={() => onChange(option.value)}
          >
            <span className={cn('block text-xl', getReaderFontClassName(option.value))}>
              {option.sample}
            </span>
            <span className="mt-1 block font-mono text-[11px] font-black uppercase tracking-wide">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function RangePreference({
  label,
  min,
  max,
  step,
  value,
  valueLabel,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  valueLabel: string;
  onChange: (value: number) => void;
}): ReactElement {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-4 text-xs font-black uppercase tracking-wide text-muted-foreground">
        {label}
        <output className="text-foreground">{valueLabel}</output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-11 w-full accent-primary"
      />
    </label>
  );
}

export function ReadingSettingsDialog({
  children,
  analysisLanguage,
  onAnalysisLanguageChange,
  preferences,
  onPreferenceChange,
}: ReadingSettingsDialogProps): ReactElement {
  const resetPreferences = () => {
    Object.entries(DEFAULT_READER_PREFERENCES).forEach(([key, value]) => {
      onPreferenceChange(
        key as keyof ReaderPreferences,
        value as ReaderPreferences[keyof ReaderPreferences],
      );
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reading</DialogTitle>
          <DialogDescription>
            Choose the language for AI output and adjust your reading appearance.
          </DialogDescription>
        </DialogHeader>
        <AnalysisLanguageSelect language={analysisLanguage} onLanguageChange={onAnalysisLanguageChange} />
        <div className="space-y-4">
          <div><h3 className="text-sm font-bold">Appearance</h3><p className="mt-1 font-sans text-xs leading-5 text-muted-foreground">Changes apply immediately to source text and saved reading work.</p></div>
          <FontPicker
            label={preferences.fontLinked ? 'Font' : 'Source font'}
            value={preferences.fontFamily}
            onChange={(font) => onPreferenceChange('fontFamily', font)}
          />
          <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={preferences.fontLinked}
              onChange={(event) => onPreferenceChange('fontLinked', event.target.checked)}
              className="h-5 w-5 accent-primary"
            />
            Keep source and analysis matched
          </label>
          {!preferences.fontLinked ? (
            <FontPicker
              label="Analysis font"
              value={preferences.closeReadingFontFamily}
              onChange={(font) => onPreferenceChange('closeReadingFontFamily', font)}
            />
          ) : null}
          <fieldset>
            <legend className="text-xs font-black uppercase tracking-wide text-muted-foreground">
              Text layout
            </legend>
            <div className="mt-1 space-y-1">
              <RangePreference
                label="Text size"
                min={15}
                max={24}
                step={1}
                value={preferences.fontSize}
                valueLabel={`${preferences.fontSize}px`}
                onChange={(value) => onPreferenceChange('fontSize', value)}
              />
              <RangePreference
                label="Line spacing"
                min={1.4}
                max={2.1}
                step={0.05}
                value={preferences.lineSpacing}
                valueLabel={preferences.lineSpacing.toFixed(2)}
                onChange={(value) => onPreferenceChange('lineSpacing', value)}
              />
              <RangePreference
                label="Line width"
                min={540}
                max={900}
                step={20}
                value={preferences.lineWidth}
                valueLabel={`${preferences.lineWidth}px`}
                onChange={(value) => onPreferenceChange('lineWidth', value)}
              />
            </div>
          </fieldset>
          <Button type="button" variant="outline" onClick={resetPreferences}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset appearance
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
    <div className="space-y-2 border-b border-border/30 pb-5">
      <p className="text-sm font-bold">AI output language</p>

      <Select
        value={language}
        onValueChange={(value) => onLanguageChange(value as AnalysisLanguage)}
      >
        <SelectTrigger
          aria-label="Analysis language"
          title="Analysis language"
          className="h-11 w-full bg-card shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ANALYSIS_LANGUAGE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="font-sans text-xs leading-5 text-muted-foreground">
        Applies to your next AI request, including Retry. Existing results and running requests stay unchanged.
      </p>
    </div>
  );
}
