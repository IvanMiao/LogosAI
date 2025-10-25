export const getLanguageLabel = (lang) => {
  const labels = {
    'zh': '中文',
    'en': 'English',
    'fr': 'Français'
  };
  return labels[lang] || lang;
};

export const getLanguageName = (lang) => {
  const names = {
    'zh': 'Chinese',
    'en': 'English',
    'fr': 'French'
  };
  return names[lang] || lang;
};

export const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
