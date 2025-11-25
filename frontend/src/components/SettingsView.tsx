import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Key, Save, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';



export function SettingsView() {
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setModel(data.model);
          setHasApiKey(data.has_api_key);
          if (data.has_api_key && data.gemini_api_key) {
            setApiKey(''); // Don't show the masked key in input
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };

  const handleSave = async () => {
    // Only require API key if not already configured
    if (!hasApiKey && !apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const payload: { model: string; gemini_api_key?: string } = {
        model: model,
      };

      // Only include API key if it's being updated
      if (apiKey.trim()) {
        payload.gemini_api_key = apiKey;
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setHasApiKey(data.has_api_key);
        setSaveSuccess(true);
        setApiKey(''); // Clear input after successful save
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
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
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    API Key {hasApiKey && <span className="text-green-600 text-xs">(Configured)</span>}
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasApiKey ? "Keep empty to maintain current API key" : "Enter your Gemini API key"}
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

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2 font-mono">
                    Model
                  </label>
                  <Select value={model} onValueChange={setModel}>
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

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
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
