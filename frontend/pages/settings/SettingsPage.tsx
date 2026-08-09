import type { ReactElement } from 'react';
import { Key, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { ApiKeySettingsForm } from './ApiKeySettingsForm';
import { useSettingsPage, type UseSettingsPageReturn } from './useSettingsPage';

export function AuthenticatedSettingsPage(): ReactElement {
  const settings = useSettingsPage();
  return <SettingsPage settings={settings} />;
}

interface SettingsPageProps {
  settings: UseSettingsPageReturn;
}

export function SettingsPage({ settings }: SettingsPageProps): ReactElement {
  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-5xl border-border shadow-hard">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-border bg-secondary shadow-hard-sm">
              <SettingsIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-mono text-xl font-semibold leading-none tracking-tight">Settings</h1>
              <CardDescription className="mt-1 font-sans text-xs">
                Manage your private AI credentials and model preference.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <section
            aria-labelledby="gemini-settings-heading"
            className="max-w-3xl border-2 border-border bg-card p-5 shadow-hard"
          >
            <div className="mb-5 flex items-center gap-3">
              <Key className="h-5 w-5" aria-hidden="true" />
              <div>
                <h2 id="gemini-settings-heading" className="font-mono text-base font-bold">
                  Gemini API
                </h2>
                <p className="mt-1 font-sans text-xs text-muted-foreground">
                  The key is encrypted in Cloudflare D1 and never returned to this browser.
                </p>
              </div>
            </div>
            <ApiKeySettingsForm settings={settings} />
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
