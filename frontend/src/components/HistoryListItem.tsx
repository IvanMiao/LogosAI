import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '@/utils/helpers';
import { HistoryItem } from '@/hooks/useAnalysis';

interface HistoryListItemProps {
  item: HistoryItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

export function HistoryListItem({ item, isExpanded, onToggleExpand, onRestore, onDelete }: HistoryListItemProps) {
  return (
    <div className="border-2 border-border p-3.5 bg-card hover:shadow-[4px_4px_0px_0px_var(--border)] transition-all duration-200">
      <div className="flex items-center gap-2 mb-2.5">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-mono">{formatDate(item.timestamp)}</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground font-mono">{formatTime(item.timestamp)}</span>
      </div>

      <div className="mb-3">
        <p className="text-sm text-foreground line-clamp-2 leading-relaxed font-mono">{item.prompt}</p>
      </div>

      {isExpanded && (
        <div className="mb-3 p-3 bg-muted border-2 border-border">
          <div className="prose prose-sm max-w-none text-xs prose-slate font-mono">
            <ReactMarkdown>{item.result}</ReactMarkdown>
          </div>
        </div>
      )}

      <Separator className="my-3 bg-border" />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleExpand}
          className="flex-1 h-8 text-xs border-2 border-border hover:bg-accent hover:text-accent-foreground shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold"
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onRestore}
          className="flex-1 h-8 text-xs bg-secondary border-2 border-border hover:bg-secondary/80 text-secondary-foreground shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Restore
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="h-8 px-2.5 text-destructive hover:text-destructive-foreground hover:bg-destructive border-2 border-transparent hover:border-border hover:shadow-[2px_2px_0px_0px_var(--border)]"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
