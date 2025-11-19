export const getLanguageLabel = (lang: string): string => {
  const labels: Record<string, string> = {
    'zh': '中文',
    'en': 'English',
    'fr': 'Français'
  };
  return labels[lang] || lang;
};

export const getLanguageName = (lang: string): string => {
  const names: Record<string, string> = {
    'zh': 'Chinese',
    'en': 'English',
    'fr': 'French'
  };
  return names[lang] || lang;
};

export const formatDate = (timestamp: string | undefined): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatTime = (timestamp: string | undefined): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
