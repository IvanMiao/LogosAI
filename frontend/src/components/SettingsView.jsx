import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Key, Save, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SettingsView() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

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
      const payload = {
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
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">Settings</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Configure your Gemini API and model preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-semibold text-slate-900">Gemini API Configuration</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    API Key {hasApiKey && <span className="text-green-600 text-xs">(Configured)</span>}
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasApiKey ? "Keep empty to maintain current API key" : "Enter your Gemini API key"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {hasApiKey ? (
                      "If you need to change API key, please enter the new key"
                    ) : (
                      <>
                        Get your API key from{' '}
                        <a
                          href="https://aistudio.google.com/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Google AI Studio
                        </a>
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Model
                  </label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {saveSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-700">Settings saved successfully!</p>
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

            <div className="p-5 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">More Settings Coming Soon</h3>
              <p className="text-sm text-blue-700">
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
