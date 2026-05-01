import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Key, Save, CheckCircle, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AnalysisModel } from '@/types';
import type { UseSettingsPageReturn } from './useSettingsPage';


function ApiKeyField({ apiKey, setApiKey, hasApiKey }: {
  apiKey: string;
  setApiKey: (key: string) => void;
  hasApiKey: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-foreground mb-2 font-mono">
        API Key {hasApiKey && <span className="text-green-600 text-xs">(Configured)</span>}
      </label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={hasApiKey ? "Enter new key to replace current one" : "Enter your Gemini API key"}
        className="w-full px-3 py-2 border-2 border-border bg-input focus:outline-none focus:ring-2 focus:ring-ring text-sm shadow-[4px_4px_0px_0px_var(--border)] font-mono"
      />
      <p className="mt-1 text-xs text-muted-foreground font-mono">
        {hasApiKey ? (
          "If you need to change API key, please enter the new key"
        ) : (
          <>
            Get your API key from{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-bold"
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

  const handleModelChange = (value: string) => {
    setModel(value as AnalysisModel);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-[4px_4px_0px_0px_var(--border)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-secondary border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]">
              <SettingsIcon className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl text-foreground font-mono">Settings</CardTitle>
              <CardDescription className="text-xs mt-0.5 font-mono">
                Configure your Gemini API and model preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-5 bg-card border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]">
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5 text-foreground" />
                <h3 className="text-base font-bold text-foreground font-mono">Gemini API Configuration</h3>
              </div>

              <div className="space-y-4">
                <ApiKeyField apiKey={apiKey} setApiKey={setApiKey} hasApiKey={hasApiKey} />

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">Model</label>
                  <Select value={model} onValueChange={handleModelChange}>
                    <SelectTrigger className="w-full border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border-2 border-destructive shadow-[4px_4px_0px_0px_var(--destructive)]">
                    <p className="text-sm text-destructive font-bold font-mono">{error}</p>
                  </div>
                )}

                {saveSuccess && (
                  <div className="p-3 bg-green-50 border-2 border-green-600 shadow-[4px_4px_0px_0px_#16a34a] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-700 font-bold font-mono">Settings saved successfully!</p>
                  </div>
                )}

                {clearConfirmOpen ? (
                  <div className="p-3 border-2 border-destructive bg-destructive/5 shadow-[2px_2px_0px_0px_var(--destructive)]">
                    <p className="text-sm font-bold text-foreground font-mono mb-3">
                      Remove your saved API key? You'll need to re-enter it to use analysis features.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { clearApiKey(); setClearConfirmOpen(false); }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold bg-destructive text-destructive-foreground border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all font-mono"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Confirm Clear
                      </button>
                      <button
                        onClick={() => setClearConfirmOpen(false)}
                        className="px-3 py-1.5 text-sm font-bold border-2 border-border bg-secondary hover:bg-secondary/80 shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all font-mono"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={saveSettings}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                    {hasApiKey && (
                      <button
                        onClick={() => setClearConfirmOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
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
              <h3 className="text-sm font-bold text-foreground mb-2 font-mono">More Settings Coming Soon</h3>
              <p className="text-sm text-muted-foreground font-mono">
                We're working on adding more customization options including default language preferences,
                history management, and analysis parameters.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
