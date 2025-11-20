import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Clock, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '@/utils/helpers';
import { useAnalysisContext } from '@/hooks/AnalysisContext';
import { HistoryItem } from '@/hooks/useAnalysis';


export function HistoryPanel() {

  const { history, onLoadHistory, onDeleteHistory } = useAnalysisContext();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDelete = (item: HistoryItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onDeleteHistory(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <>
      <Card className="border-border shadow-[4px_4px_0px_0px_var(--border)] sticky top-4">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-secondary border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]">
              <History className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground font-mono">Analysis History</CardTitle>
              <CardDescription className="text-xs mt-0.5 font-mono">
                {history.length > 0 ? `${history.length} previous ${history.length === 1 ? 'analysis' : 'analyses'}` : 'No records'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-muted border-2 border-border flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_var(--border)]">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-foreground mb-1 font-mono">No History Yet</p>
              <p className="text-xs text-muted-foreground font-mono">Your analysis history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="border-2 border-border p-3.5 bg-card hover:shadow-[4px_4px_0px_0px_var(--border)] transition-all duration-200"
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatDate(item.timestamp)}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-foreground line-clamp-2 leading-relaxed font-mono">
                        {item.prompt}
                      </p>
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
                        onClick={() => toggleExpanded(item.id)}
                        className="flex-1 h-8 text-xs border-2 border-border hover:bg-accent hover:text-accent-foreground shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onLoadHistory(item)}
                        className="flex-1 h-8 text-xs bg-secondary border-2 border-border hover:bg-secondary/80 text-secondary-foreground shadow-[2px_2px_0px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none font-bold"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item)}
                        className="h-8 px-2.5 text-destructive hover:text-destructive-foreground hover:bg-destructive border-2 border-transparent hover:border-border hover:shadow-[2px_2px_0px_0px_var(--border)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <DialogTitle className="text-xl text-slate-900 font-bold">Delete Analysis</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 text-sm leading-relaxed pt-2">
              This will permanently delete this analysis from your history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {itemToDelete && (
            <div className="py-3">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500 mb-2">Content to be deleted:</p>
                <p className="text-sm text-slate-800 line-clamp-3 leading-relaxed">
                  {itemToDelete.prompt}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
              className="border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
