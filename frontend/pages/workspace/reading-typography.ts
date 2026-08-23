import type { ReaderFontFamily } from '@/features/reading';

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
  return sourceFontSize;
}
