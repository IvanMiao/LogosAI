import React, { useState, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('zh');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Components hook status
  useEffect(() => {
    setMounted(true);
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
    <div className="container">

      <header className={`header ${mounted ? 'fade-in' : ''}`}>
        <h1 className="title">LogosAI</h1>
        <p className="subtitle">Text Analysis</p>
      </header>

      <main className={`main-content ${mounted ? 'fade-in' : ''}`}>
        <div className="card">
          <div className="input-group">
            <label htmlFor="language-select">Choose your language</label>
            <select 
              id="language-select"
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isLoading}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div className="textarea-wrapper">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Put text here, deep analysis will be generated soon..."
              rows="8"
              disabled={isLoading}
            />
          </div>

          <button 
            className={`analyze-button ${isLoading ? 'loading' : ''}`}
            onClick={handleAnalyze} 
            disabled={isLoading}
          >
            {isLoading ? 'AI Analysing...' : 'Begin to analyse'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <h3>ERROR</h3>
            <p>{error}</p>
          </div>
        )}
        
        {result && (
          <div className="result-display">
            <h2>Analysis Result</h2>
            <div className="result-content markdown-content">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;