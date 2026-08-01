import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { HistoryItem } from '@/types';

interface HistoryDrawerProps {
  open: boolean;
  history: HistoryItem[];
  onOpenChange: (open: boolean) => void;
  onOpenAsDocument: (item: HistoryItem) => void;
  onDeleteHistoryItem: (id: number) => void;
}

interface HistoryListProps {
  history: HistoryItem[];
  onOpenAsDocument: (item: HistoryItem) => void;
  onDeleteHistoryItem: (id: number) => void;
}

function HistoryList({
  history,
  onOpenAsDocument,
  onDeleteHistoryItem,
}: HistoryListProps): ReactElement {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No legacy history yet.</p>;
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {history.map((item) => (
        <div key={item.id} className="py-4">
          <p className="line-clamp-3 font-sans text-sm leading-6">{item.prompt}</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" onClick={() => onOpenAsDocument(item)}>
              Open as document
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Delete history item ${item.id}`}
              onClick={() => onDeleteHistoryItem(item.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HistoryDrawer({
  open,
  history,
  onOpenChange,
  onOpenAsDocument,
  onDeleteHistoryItem,
}: HistoryDrawerProps): ReactElement {
  const handleOpenAsDocument = (item: HistoryItem) => {
    onOpenAsDocument(item);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 h-dvh max-h-dvh max-w-md translate-x-0 translate-y-0 overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle>Legacy history</DialogTitle>
          <DialogDescription>Open an older analysis prompt as a workspace document.</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <HistoryList
            history={history}
            onOpenAsDocument={handleOpenAsDocument}
            onDeleteHistoryItem={onDeleteHistoryItem}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
