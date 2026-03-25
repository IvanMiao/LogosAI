export const formatDate = (timestamp: string | undefined): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatTime = (timestamp: string | undefined): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
