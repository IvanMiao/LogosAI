import type { DocumentSourceType, WorkspaceDocument } from './workspace.types';

const SUPPORTED_TEXT_FILE_EXTENSIONS = ['.txt', '.md'];

function createDocumentTitle(text: string, fallback: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0);
  if (!firstLine) {
    return fallback;
  }

  return firstLine.trim().replace(/^#+\s*/, '').slice(0, 80);
}

export function createWorkspaceDocument(
  text: string,
  sourceType: DocumentSourceType,
  fallbackTitle = 'Untitled document',
): WorkspaceDocument {
  const now = new Date().toISOString();

  return {
    id: `document-${Date.now()}`,
    title: createDocumentTitle(text, fallbackTitle),
    text,
    sourceType,
    createdAt: now,
    updatedAt: now,
  };
}

export function splitDocumentParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export interface DocumentParagraph {
  text: string;
  startOffset: number;
  endOffset: number;
}

export function splitDocumentParagraphsWithOffsets(text: string): DocumentParagraph[] {
  const paragraphs: DocumentParagraph[] = [];
  const paragraphMatcher = /\S[\s\S]*?(?=\n\s*\n|$)/g;
  let match = paragraphMatcher.exec(text);

  while (match) {
    const rawParagraph = match[0];
    const leadingWhitespace = rawParagraph.match(/^\s*/)?.[0].length ?? 0;
    const trailingWhitespace = rawParagraph.match(/\s*$/)?.[0].length ?? 0;
    const startOffset = match.index + leadingWhitespace;
    const endOffset = match.index + rawParagraph.length - trailingWhitespace;
    const paragraphText = text.slice(startOffset, endOffset);

    if (paragraphText.trim()) {
      paragraphs.push({ text: paragraphText, startOffset, endOffset });
    }

    match = paragraphMatcher.exec(text);
  }

  return paragraphs;
}

export function isSupportedTextFile(fileName: string): boolean {
  const lowerFileName = fileName.toLowerCase();
  return SUPPORTED_TEXT_FILE_EXTENSIONS.some((extension) => lowerFileName.endsWith(extension));
}

export function formatDocumentMeta(document: WorkspaceDocument): string {
  const wordCount = document.text.trim().split(/\s+/).filter(Boolean).length;
  const sourceLabelByType: Record<WorkspaceDocument['sourceType'], string> = {
    file: 'Local file',
    history: 'History',
    paste: 'Pasted text',
  };
  const sourceLabel = sourceLabelByType[document.sourceType];
  return `${sourceLabel} · ${wordCount} words`;
}
