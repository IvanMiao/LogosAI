import { useState, useCallback } from 'react';

export function useAnalysis() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('zh');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
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
  }, []);

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
        fetchHistory();
      } else {
        throw new Error(data.error || 'Analysis failed, no specifique error information returned');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [text, language, fetchHistory]);

  const handleDeleteHistory = async (id) => {
    try {
      const response = await fetch(`http://localhost:8000/history/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchHistory();
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

  return {
    text,
    setText,
    language,
    setLanguage,
    result,
    history,
    isLoading,
    error,
    fetchHistory,
    handleAnalyze,
    handleDeleteHistory,
    handleLoadHistory,
  };
}
