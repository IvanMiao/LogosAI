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
        {item && (
          <div className="py-3">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-2">Content to be deleted:</p>
              <p className="text-sm text-slate-800 line-clamp-3 leading-relaxed">{item.prompt}</p>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
