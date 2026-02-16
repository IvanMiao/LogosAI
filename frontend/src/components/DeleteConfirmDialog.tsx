import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { HistoryItem } from '@/hooks/useAnalysis';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: HistoryItem | null;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, onOpenChange, item, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <DialogTitle className="text-xl text-foreground font-bold">Delete Analysis</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed pt-2">
            This will permanently delete this analysis from your history. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {item && (
          <div className="py-3">
            <div className="p-4 bg-muted rounded-lg border border-border shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-2">Content to be deleted:</p>
              <p className="text-sm text-foreground line-clamp-3 leading-relaxed">{item.prompt}</p>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
