import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Clock, Eye, RotateCcw, Trash2, FolderOpen } from 'lucide-react';
import { formatDate, formatTime } from '@/utils/helpers';

export function HistoryPanel({ history, onLoadHistory, onDeleteHistory }) {
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
      <Card className="border-slate-200 shadow-lg shadow-slate-200/50 sticky top-4 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300">
        <CardHeader className="pb-4 bg-gradient-to-br from-slate-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl flex items-center justify-center ring-2 ring-purple-100 ring-offset-2">
              <History className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900 font-bold">Analysis History</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {history.length > 0 ? `${history.length} previous ${history.length === 1 ? 'analysis' : 'analyses'}` : 'No records yet'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-2 ring-slate-200 ring-offset-2">
                <FolderOpen className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">No History Yet</p>
              <p className="text-xs text-slate-500 leading-relaxed">Your analysis history will<br />appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="group border border-slate-200 rounded-xl p-4 bg-white hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/50 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors duration-200" />
                      <span className="text-xs text-slate-500 font-mono group-hover:text-slate-700 transition-colors duration-200">
                        {formatDate(item.timestamp)}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 font-mono group-hover:text-slate-700 transition-colors duration-200">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed group-hover:text-slate-900 transition-colors duration-200">
                        {item.prompt}
                      </p>
                    </div>

                    {isExpanded && (
                      <div className="mb-3 p-3 bg-gradient-to-br from-slate-50 to-slate-50/50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2 duration-200">
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
                        className="flex-1 h-8 text-xs border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all duration-200"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onLoadHistory(item)}
                        className="flex-1 h-8 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all duration-200"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item)}
                        className="h-8 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
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
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-50 rounded-xl flex items-center justify-center ring-2 ring-red-200">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl text-slate-900 font-bold">Delete Analysis</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 text-sm leading-relaxed pt-2">
              This will permanently delete this analysis from your history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {itemToDelete && (
            <div className="py-3">
              <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-50/50 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-sm font-semibold text-slate-500 mb-2">Content to be deleted:</p>
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
              className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all duration-200"
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
