import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FileText, Loader2, AlertCircle, Languages } from 'lucide-react';
import { useAnalysisContext } from '@/hooks/AnalysisContext';
import { ResultCard } from '@/components/ResultCard';


export function AnalysisPanel() {
  const { text, setText, language, setLanguage, result, isLoading, error, onAnalyze } = useAnalysisContext();

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-[4px_4px_0px_0px_var(--border)]">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-secondary border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]">
                <FileText className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl text-foreground font-mono">INPUT_ZONE</CardTitle>
                <CardDescription className="text-xs mt-0.5 font-mono">PROVIDE_SOURCE_TEXT</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="text-sm font-bold text-foreground mb-2.5 flex items-center gap-2 font-mono">
              <Languages className="w-4 h-4" />
              <span>TARGET_LANGUAGE</span>
            </label>
            <Select value={language} onValueChange={setLanguage} disabled={isLoading}>
              <SelectTrigger className="w-full h-11 border-2 border-border bg-input shadow-[4px_4px_0px_0px_var(--border)]">
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
              <label className="text-sm font-bold text-foreground font-mono">RAW_CONTENT</label>
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 border border-border">{text.length} chars</span>
            </div>
            <Textarea
              value={text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              placeholder="INSERT_TEXT_DATA..."
              rows={12}
              disabled={isLoading}
              className="resize-none text-sm border-2 border-border focus:ring-0 focus:border-border shadow-[4px_4px_0px_0px_var(--border)] font-mono"
            />
          </div>

          <Button
            onClick={onAnalyze}
            disabled={isLoading || !text.trim()}
            className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 mr-2" />
                INITIATE_ANALYSIS
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-2 border-destructive bg-destructive/10 shadow-[4px_4px_0px_0px_var(--destructive)]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-destructive border-2 border-destructive-foreground flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-destructive-foreground" />
              </div>
              <div>
                <h3 className="text-destructive-foreground font-bold mb-1.5 font-mono">Analysis Error</h3>
                <p className="text-destructive-foreground text-sm leading-relaxed font-mono">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && <ResultCard result={result} />}
    </div>
  );
}
