import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Copy, Check } from 'lucide-react';

interface ResultCardProps {
  result: string;
}

export function ResultCard({ result }: ResultCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Card className="border-border shadow-[4px_4px_0px_0px_var(--border)]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]">
              <FileText className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl text-foreground font-mono">ANALYSIS_OUTPUT</CardTitle>
              <CardDescription className="text-xs mt-0.5 font-mono">GENERATED_INSIGHTS</CardDescription>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="h-9 border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-mono"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                COPIED
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                COPY_TEXT
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-slate max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg font-mono">
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
