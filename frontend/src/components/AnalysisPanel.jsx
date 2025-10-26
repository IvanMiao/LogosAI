import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileText, Loader2, AlertCircle, Languages, Sparkles, CheckCircle2 } from 'lucide-react';

export function AnalysisPanel({ text, setText, language, setLanguage, result, isLoading, error, onAnalyze }) {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center ring-2 ring-indigo-100 ring-offset-2">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900 font-bold">Text Analysis</CardTitle>
                <CardDescription className="text-xs mt-0.5">Input your content for AI-powered insights</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2" htmlFor="language-select">
              <Languages className="w-4 h-4 text-indigo-600" />
              <span>Analysis Language</span>
            </label>
            <Select value={language} onValueChange={setLanguage} disabled={isLoading}>
              <SelectTrigger id="language-select" className="w-full h-11 border-slate-300 bg-white hover:border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500 transition-colors duration-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">🇨🇳 中文 (Chinese)</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="fr">🇫🇷 Français (French)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-semibold text-slate-700" htmlFor="text-input">Input Text</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">{text.length} characters</span>
              </div>
            </div>
            <Textarea
              id="text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter or paste your text here for analysis...&#10;&#10;Try analyzing articles, essays, code, or any content you'd like to understand better."
              rows={12}
              disabled={isLoading}
              className="resize-none text-sm border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-200 hover:border-slate-400"
            />
          </div>

          <Button
            onClick={onAnalyze}
            disabled={isLoading || !text.trim()}
            className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 text-white shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 mr-2" />
                Start Analysis
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-300 bg-gradient-to-br from-red-50 to-red-50/50 shadow-lg shadow-red-200/50 animate-in slide-in-from-top-4 duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-red-200">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-red-900 font-bold mb-1.5">Analysis Error</h3>
                <p className="text-red-700 text-sm leading-relaxed">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-emerald-200 shadow-lg shadow-emerald-200/50 animate-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="pb-4 bg-gradient-to-br from-emerald-50/50 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl flex items-center justify-center ring-2 ring-emerald-200 ring-offset-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900 font-bold">Analysis Results</CardTitle>
                <CardDescription className="text-xs mt-0.5">AI-generated insights and analysis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-indigo-600 hover:prose-a:text-indigo-700">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
