import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Clock, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '@/utils/helpers';
import { useAnalysisContext } from '@/hooks/AnalysisContext';


export function HistoryPanel() {
  
  const { history, onLoadHistory, onDeleteHistory } = useAnalysisContext();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleExpanded = (id) => {
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

  const handleDelete = (item) => {
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
      <Card className="border-slate-200 shadow-sm sticky top-4">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Analysis History</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {history.length > 0 ? `${history.length} previous ${history.length === 1 ? 'analysis' : 'analyses'}` : 'No records'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">No History Yet</p>
              <p className="text-xs text-slate-500">Your analysis history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-lg p-3.5 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500 font-mono">
                        {formatDate(item.timestamp)}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500 font-mono">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </div>

                    {isExpanded && (
                      <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="prose prose-sm max-w-none text-xs prose-slate">
                          <ReactMarkdown>{item.result}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    <Separator className="my-3" />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleExpanded(item.id)}
                        className="flex-1 h-8 text-xs border-slate-300 hover:bg-slate-50"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onLoadHistory(item)}
                        className="flex-1 h-8 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item)}
                        className="h-8 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50"
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
