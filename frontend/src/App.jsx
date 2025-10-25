import React, { useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Brain, History, FileText, Trash2, Loader2, Clock, Eye, RotateCcw, AlertCircle, Languages } from 'lucide-react';
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('zh');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Components hook status
  useEffect(() => {
    setMounted(true);
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/history');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHistory(data.history);
        }
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    }
  };

  const handleDeleteHistory = async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/history/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchHistory();
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    } catch (e) {
      console.error('Failed to delete history:', e);
    }
  };

  const handleLoadHistory = (item) => {
    setText(item.prompt);
    setResult(item.result);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const getLanguageLabel = (lang) => {
    const labels = {
      'zh': '中文',
      'en': 'English',
      'fr': 'Français'
    };
    return labels[lang] || lang;
  };

  const getLanguageName = (lang) => {
    const names = {
      'zh': 'Chinese',
      'en': 'English',
      'fr': 'French'
    };
    return names[lang] || lang;
  };

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter a text');
      setResult('');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');

    try {
      // backend server runs on 8000 port (defined in backend-FastAPI)
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          user_language: language,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        fetchHistory(); // Refresh history after new analysis
      }
      else {
        throw new Error(data.error || 'Analysis failed, no specifique error information returned');
      }
    }
    catch (e) {
      setError(e.message);
    }
    finally {
      setIsLoading(false);
    }
  }, [text, language]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className={`mb-8 transition-all duration-800 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    LogosAI
                  </h1>
                  <p className="text-sm text-slate-600 mt-0.5">Advanced Text Analysis Platform</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs px-3 py-1 border-slate-300 text-slate-700">
                v1.0
              </Badge>
            </div>
          </div>
        </header>

        <main className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Analysis Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-slate-700" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-slate-900">Text Analysis</CardTitle>
                        <CardDescription className="text-xs mt-0.5">Input your content for AI-powered analysis</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2.5 flex items-center gap-2">
                      <Languages className="w-4 h-4" />
                      <span>Analysis Language</span>
                    </label>
                    <Select value={language} onValueChange={setLanguage} disabled={isLoading}>
                      <SelectTrigger className="w-full h-11 border-slate-300 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh">中文 (Chinese)</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">Français (French)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2.5">
                      <label className="text-sm font-medium text-slate-700">Input Text</label>
                      <span className="text-xs text-slate-500 font-mono">{text.length} chars</span>
                    </div>
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Enter or paste your text here for analysis..."
                      rows={12}
                      disabled={isLoading}
                      className="resize-none text-sm border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                    />
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={isLoading || !text.trim()}
                    className="w-full h-12 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5 mr-2" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Error Display */}
              {error && (
                <Card className="border-red-300 bg-red-50 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-red-900 font-semibold mb-1.5">Analysis Error</h3>
                        <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Result Display */}
              {result && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-slate-900">Analysis Results</CardTitle>
                        <CardDescription className="text-xs mt-0.5">AI-generated insights and analysis</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg">
                      <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* History Sidebar */}
            <div className="lg:col-span-1">
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
                                {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs text-slate-500 font-mono">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                onClick={() => handleLoadHistory(item)}
                                className="flex-1 h-8 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setItemToDelete(item);
                                  setDeleteDialogOpen(true);
                                }}
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
            </div>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Delete Analysis</DialogTitle>
            <DialogDescription className="text-slate-600">
              This will permanently delete this analysis from your history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {itemToDelete && (
            <div className="py-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-700 line-clamp-3 leading-relaxed">
                  {itemToDelete.prompt}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteHistory(itemToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
