import type { ReaderFontFamily } from './workspace.types';

const CLOSE_READING_FONT_SIZE_OFFSET = 2;
const MIN_CLOSE_READING_FONT_SIZE = 15;

export function getReaderFontClassName(fontFamily: ReaderFontFamily): string {
  if (fontFamily === 'sans') {
    return 'font-sans';
  }

  if (fontFamily === 'mono') {
    return 'font-mono';
  }

  return 'font-serif';
}

export function getCloseReadingFontSize(sourceFontSize: number): number {
  return Math.max(
    MIN_CLOSE_READING_FONT_SIZE,
    sourceFontSize - CLOSE_READING_FONT_SIZE_OFFSET,
  );
}
