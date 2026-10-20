// Plain level-two exercise headings share the fragment convention of headingIds.
// Ignore fenced examples so search cards only link to actual exercise sections.
export function problemLinks(body: string): string[] {
  const ids = new Set<string>();
  let fence: {character: string; length: number} | undefined;
  for (const line of body.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      if (!fence) fence = {character: marker[1][0], length: marker[1].length};
      else if (marker[1][0] === fence.character && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      continue;
    }
    if (fence) continue;
    const match = line.match(/^## (20\d{2}[AS]\d{2})\s*$/);
    if (match) ids.add(match[1]);
  }
  return [...ids];
}
