import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type RefObject,
} from 'react';
import { CheckCircle, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AnalysisModel } from '@/types';
import {
  MISSING_API_KEY_ERROR,
  type UseSettingsPageReturn,
} from './useSettingsPage';

const API_KEY_INPUT_ID = 'settings-api-key';
const API_KEY_HELP_ID = 'settings-api-key-help';
const SETTINGS_ERROR_ID = 'settings-error';
const MODEL_TRIGGER_ID = 'settings-model';

interface ApiKeySettingsFormProps {
  settings: UseSettingsPageReturn;
}

export function ApiKeySettingsForm({
  settings,
}: ApiKeySettingsFormProps): ReactElement {
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const apiKeyInputRef = useRef<HTMLInputElement | null>(null);
  const hasApiKeyError = settings.error === MISSING_API_KEY_ERROR;

  useEffect(() => {
    if (hasApiKeyError) apiKeyInputRef.current?.focus();
  }, [hasApiKeyError]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void settings.saveSettings();
  };

  const clearApiKey = async () => {
    await settings.clearApiKey();
    setClearConfirmOpen(false);
  };

  return (
    <form noValidate className="space-y-5" onSubmit={handleSubmit}>
      <ApiKeyField
        inputRef={apiKeyInputRef}
        value={settings.apiKey}
        hint={settings.apiKeyHint}
        hasApiKey={settings.hasApiKey}
        hasError={hasApiKeyError}
        disabled={settings.isLoading}
        onChange={settings.setApiKey}
      />
      <div>
        <label htmlFor={MODEL_TRIGGER_ID} className="mb-2 block font-mono text-sm font-bold">
          Model
        </label>
        <Select
          value={settings.model}
          disabled={settings.isLoading}
          onValueChange={(value) => settings.setModel(value as AnalysisModel)}
        >
          <SelectTrigger id={MODEL_TRIGGER_ID} className="h-11 w-full border-2 border-border shadow-hard-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
            <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.error ? (
        <p
          id={SETTINGS_ERROR_ID}
          role={hasApiKeyError ? undefined : 'alert'}
          className="border-2 border-destructive bg-destructive/10 p-3 font-mono text-sm font-bold text-error-foreground"
        >
          {settings.error}
        </p>
      ) : null}
      {settings.saveSuccess ? (
        <div role="status" aria-live="polite" className="flex items-center gap-2 border-2 border-border bg-secondary p-3 text-secondary-foreground shadow-hard-sm">
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          <p className="font-mono text-sm font-bold">Settings saved successfully.</p>
        </div>
      ) : null}

      {clearConfirmOpen ? (
        <ClearKeyConfirmation
          isClearing={settings.isClearing}
          onCancel={() => setClearConfirmOpen(false)}
          onConfirm={() => void clearApiKey()}
        />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button className="min-h-11" type="submit" disabled={settings.isLoading || settings.isSaving}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {settings.isLoading
              ? 'Loading settings…'
              : settings.isSaving ? 'Saving settings…' : 'Save settings'}
          </Button>
          {settings.hasApiKey ? (
            <Button className="min-h-11" type="button" variant="destructive" onClick={() => setClearConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove API key
            </Button>
          ) : null}
        </div>
      )}
    </form>
  );
}

function ApiKeyField({
  inputRef,
  value,
  hint,
  hasApiKey,
  hasError,
  disabled,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  hint: string | null;
  hasApiKey: boolean;
  hasError: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}): ReactElement {
  const describedBy = hasError
    ? `${API_KEY_HELP_ID} ${SETTINGS_ERROR_ID}`
    : API_KEY_HELP_ID;

  return (
    <div>
      <label htmlFor={API_KEY_INPUT_ID} className="mb-2 block font-mono text-sm font-bold">
        API key {hasApiKey ? <span className="text-xs text-muted-foreground">({hint ?? 'Configured'})</span> : null}
      </label>
      <input
        ref={inputRef}
        id={API_KEY_INPUT_ID}
        name="gemini-api-key"
        type="password"
        value={value}
        disabled={disabled}
        required={!hasApiKey}
        autoComplete="off"
        placeholder={hasApiKey ? 'Enter a new key to replace it' : 'AIza…'}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full border-2 border-border bg-input px-3 py-2 font-mono text-base shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
      />
      <p id={API_KEY_HELP_ID} className="mt-2 max-w-[70ch] font-sans text-xs leading-5 text-muted-foreground">
        {hasApiKey
          ? 'Leave this blank to keep the saved key.'
          : <>Create a key in <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="font-bold text-link underline underline-offset-2">Google AI Studio</a>, then paste it here.</>}
      </p>
    </div>
  );
}

function ClearKeyConfirmation({
  isClearing,
  onCancel,
  onConfirm,
}: {
  isClearing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactElement {
  return (
    <div className="border-2 border-destructive bg-destructive/5 p-3 shadow-hard-sm">
      <p className="mb-3 font-mono text-sm font-bold">
        Remove the saved API key? AI actions will stop until you add another key.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11" type="button" variant="destructive" disabled={isClearing} onClick={onConfirm}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {isClearing ? 'Removing key…' : 'Remove API key'}
        </Button>
        <Button className="min-h-11" type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
