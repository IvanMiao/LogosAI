export function getLatestThoughtHeading(thinking: string): string | undefined {
  const headings = [...thinking.matchAll(/(?:^|\n)[ \t]*\*\*([^*\r\n]+)\*\*[ \t\r]*(?=\n|$)/g)];
  return headings[headings.length - 1]?.[1].trim();
}
