import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';
import { useAnalysisContext } from '@/hooks/AnalysisContext';
import { HistoryItem } from '@/hooks/useAnalysis';
import { HistoryListItem } from '@/components/HistoryListItem';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';


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
              {history.map((item) => (
                <HistoryListItem
                  key={item.id}
                  item={item}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={() => toggleExpanded(item.id)}
                  onRestore={() => onLoadHistory(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setItemToDelete(null);
          }
        }}
        item={itemToDelete}
        onConfirm={confirmDelete}
      />
    </>
  );
}
