import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileText, Loader2, AlertCircle, Languages } from 'lucide-react';
import { useAnalysisContext } from '@/hooks/AnalysisContext';


export function AnalysisPanel() {
  const { text, setText, language, setLanguage, result, isLoading, error, onAnalyze } = useAnalysisContext();

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900">Text Analysis</CardTitle>
                <CardDescription className="text-xs mt-0.5">Input your content for AI-powered analysis</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2.5 flex items-center gap-2">
              <Languages className="w-4 h-4" />
              <span>Analysis Language</span>
            </label>
            <Select value={language} onValueChange={setLanguage} disabled={isLoading}>
              <SelectTrigger className="w-full h-11 border-slate-300 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">中文 (Chinese)</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français (French)</SelectItem>
                <SelectItem value="de">Deutsch (German)</SelectItem>
                <SelectItem value="es">Español (Spanish)</SelectItem>
                <SelectItem value="it">Italiano (Italian)</SelectItem>
                <SelectItem value="ja">日本語 (Japanese)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-sm font-medium text-slate-700">Input Text</label>
              <span className="text-xs text-slate-500 font-mono">{text.length} chars</span>
            </div>
            <Textarea
              value={text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              placeholder="Enter or paste your text here for analysis..."
              rows={12}
              disabled={isLoading}
              className="resize-none text-sm border-slate-300 focus:border-slate-500 focus:ring-slate-500"
            />
          </div>

          <Button
            onClick={onAnalyze}
            disabled={isLoading || !text.trim()}
            className="w-full h-12 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white"
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
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-300 bg-red-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-red-900 font-semibold mb-1.5">Analysis Error</h3>
                <p className="text-red-700 text-sm leading-relaxed">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900">Analysis Results</CardTitle>
                <CardDescription className="text-xs mt-0.5">AI-generated insights and analysis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
