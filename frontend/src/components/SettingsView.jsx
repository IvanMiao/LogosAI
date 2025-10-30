import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Sun, Moon, Palette } from 'lucide-react';

export function SettingsView() {
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
                Customize your LogosAI experience
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <Palette className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-semibold text-slate-900">Appearance</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Theme customization options will be available in future updates.
              </p>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-slate-900 bg-white text-slate-900 text-sm font-medium">
                  <Sun className="w-4 h-4" />
                  Light Mode
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-500 text-sm font-medium opacity-50 cursor-not-allowed">
                  <Moon className="w-4 h-4" />
                  Dark Mode (Coming Soon)
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
