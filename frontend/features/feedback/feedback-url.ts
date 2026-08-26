export const DEFAULT_FEEDBACK_FORM_URL = 'https://tally.so/r/68E7VP';

export type FeedbackSource = 'landing' | 'auth' | 'app_chrome' | 'workspace';

export function getFeedbackFormUrl(
  source: FeedbackSource,
  formUrl = getConfiguredFeedbackFormUrl(),
): string {
  const url = new URL(formUrl);
  url.searchParams.set('source', source);
  return url.toString();
}

function getConfiguredFeedbackFormUrl(): string {
  const configured = import.meta.env.VITE_FEEDBACK_URL?.trim();
  return configured || DEFAULT_FEEDBACK_FORM_URL;
}
