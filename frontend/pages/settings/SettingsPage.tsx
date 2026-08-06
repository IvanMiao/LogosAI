import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Settings as SettingsIcon, Key, Save, CheckCircle, Trash2 } from 'lucide-react';
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

function ApiKeyField({ apiKey, setApiKey, hasApiKey, hasError, inputRef }: {
  apiKey: string;
  setApiKey: (key: string) => void;
  hasApiKey: boolean;
  hasError: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const describedBy = hasError
    ? `${API_KEY_HELP_ID} ${SETTINGS_ERROR_ID}`
    : API_KEY_HELP_ID;

  return (
    <div>
      <label htmlFor={API_KEY_INPUT_ID} className="mb-2 block font-mono text-sm font-bold text-foreground">
        API Key {hasApiKey && <span className="text-xs text-green-700">(Configured)</span>}
      </label>
      <input
        ref={inputRef}
        id={API_KEY_INPUT_ID}
        name="gemini-api-key"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={hasApiKey ? "Enter new key to replace current one" : "Enter your Gemini API key"}
        autoComplete="off"
        aria-invalid={hasError}
        aria-describedby={describedBy}
        className="w-full border-2 border-border bg-input px-3 py-2 font-mono text-base shadow-[4px_4px_0px_0px_var(--border)] focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
      />
      <p id={API_KEY_HELP_ID} className="mt-1 max-w-[70ch] font-sans text-xs text-muted-foreground">
        {hasApiKey ? (
          "If you need to change API key, please enter the new key"
        ) : (
          <>
            Get your API key from{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-link underline-offset-2 hover:underline"
            >
              Google AI Studio
            </a>
          </>
        )}
      </p>
    </div>
  );
}


interface SettingsPageProps {
  settings: UseSettingsPageReturn;
}

export function SettingsPage({ settings }: SettingsPageProps) {
  const {
    apiKey,
    setApiKey,
    model,
    setModel,
    hasApiKey,
    isSaving,
    saveSuccess,
    error,
    saveSettings,
    clearApiKey,
  } = settings;

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const apiKeyInputRef = useRef<HTMLInputElement | null>(null);
  const hasApiKeyError = error === MISSING_API_KEY_ERROR;

  useEffect(() => {
    if (hasApiKeyError) {
      apiKeyInputRef.current?.focus();
    }
  }, [hasApiKeyError]);

  const handleModelChange = (value: string) => {
    setModel(value as AnalysisModel);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveSettings();
  };

  return (
    <div className="space-y-6">
      <p className="sr-only" role="status" aria-live="polite">
        {saveSuccess ? 'Settings saved successfully!' : ''}
      </p>
      <Card className="mx-auto max-w-5xl border-border shadow-[4px_4px_0px_0px_var(--border)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-secondary border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]">
              <SettingsIcon className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="font-mono text-xl font-semibold leading-none tracking-tight text-foreground">Settings</h1>
              <CardDescription className="mt-0.5 font-sans text-xs">
                Configure your Gemini API and model preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="max-w-3xl space-y-4" onSubmit={handleSubmit}>
            <div className="p-5 bg-card border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]">
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5 text-foreground" />
                <h2 className="text-base font-bold text-foreground font-mono">Gemini API Configuration</h2>
              </div>

              <div className="space-y-4">
                <ApiKeyField
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                  hasApiKey={hasApiKey}
                  hasError={hasApiKeyError}
                  inputRef={apiKeyInputRef}
                />

                <div>
                  <label htmlFor={MODEL_TRIGGER_ID} className="block text-sm font-bold text-foreground mb-2 font-mono">Model</label>
                  <Select value={model} onValueChange={handleModelChange}>
                    <SelectTrigger id={MODEL_TRIGGER_ID} className="w-full border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div
                    id={SETTINGS_ERROR_ID}
                    role={hasApiKeyError ? undefined : 'alert'}
                    className="p-3 bg-destructive/10 border-2 border-destructive shadow-[4px_4px_0px_0px_var(--destructive)]"
                  >
                    <p className="text-sm text-error-foreground font-bold font-mono">{error}</p>
                  </div>
                )}

                {saveSuccess && (
                  <div aria-hidden="true" className="p-3 bg-green-50 border-2 border-green-600 shadow-[4px_4px_0px_0px_#16a34a] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-700 font-bold font-mono">Settings saved successfully!</p>
                  </div>
                )}

                {clearConfirmOpen ? (
                  <div className="p-3 border-2 border-destructive bg-destructive/5 shadow-[2px_2px_0px_0px_var(--destructive)]">
                    <p className="text-sm font-bold text-foreground font-mono mb-3">
                      Remove your saved API key? You'll need to re-enter it to use analysis features.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { clearApiKey(); setClearConfirmOpen(false); }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold bg-destructive text-destructive-foreground border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-[background-color,box-shadow,transform] motion-reduce:transition-none font-mono"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Confirm Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setClearConfirmOpen(false)}
                        className="px-3 py-1.5 text-sm font-bold border-2 border-border bg-secondary hover:bg-secondary/80 shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-[background-color,box-shadow,transform] motion-reduce:transition-none font-mono"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-[background-color,box-shadow,transform] motion-reduce:transition-none"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                    {hasApiKey && (
                      <button
                        type="button"
                        onClick={() => setClearConfirmOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-[background-color,box-shadow,transform] motion-reduce:transition-none"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear API Key
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 bg-accent/20 border-2 border-accent shadow-[4px_4px_0px_0px_var(--accent)]">
              <h2 className="text-sm font-bold text-foreground mb-2 font-mono">More Settings Coming Soon</h2>
              <p className="max-w-[70ch] font-sans text-sm text-muted-foreground">
                We're working on adding more customization options including default language preferences,
                history management, and analysis parameters.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
