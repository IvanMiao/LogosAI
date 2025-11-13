import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Brain, Code, Layers, ExternalLink } from 'lucide-react';

export function AboutView() {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
              <Info className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">About LogosAI</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Advanced Text Analysis Platform
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">What is LogosAI?</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  LogosAI is an AI-powered text analysis platform that deeply reads and reasons about 
                  text in any language. It provides comprehensive insights including themes, sentiment, 
                  structure analysis, and key takeaways to help you understand written content better.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-3">Tech Stack</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Frontend</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">React</Badge>
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">Vite</Badge>
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">TailwindCSS</Badge>
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">shadcn/ui</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Backend</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">Langchain</Badge>
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">FastAPI</Badge>
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">SQLite</Badge>
                      <Badge variant="outline" className="text-xs border-slate-300 text-slate-700">Pydantic</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Code className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Open Source</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  LogosAI is an open-source project. Check out the source code on GitHub.
                </p>
                <a 
                  href="https://github.com/IvanMiao/LogosAI" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on GitHub
                </a>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Version 1.0</span>
              <span>© 2025 LogosAI</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
