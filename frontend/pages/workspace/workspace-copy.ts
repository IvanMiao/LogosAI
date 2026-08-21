/**
 * Copy shared between the hooks that produce workspace failures and the
 * components that render them, so a message and its remedy cannot drift apart.
 */
export const MISSING_API_KEY_MESSAGE = 'Missing Gemini API key. Configure it in Settings.';

export const SETTINGS_PATH = '/app/settings';

/**
 * Reader-facing wording for the pipeline stages the backend streams before the
 * first token of an answer arrives. Without these the longest part of the wait
 * — one or two model calls that happen before any text — looks like a stall.
 */
const STAGE_LABELS: Record<string, string> = {
  correct: 'Cleaning up the source text…',
  detect: 'Reading the language and genre…',
  interpret: 'Writing the explanation…',
};

export function getStageLabel(stage: string | undefined): string | undefined {
  if (!stage) {
    return undefined;
  }

  return STAGE_LABELS[stage] ?? undefined;
}
