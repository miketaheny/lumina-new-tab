// v2/packages/core/src/note-format.ts
import type { Note } from './types';

function yamlValue(val: string): string {
  if (/[:#{}[\],&*?|>!%@`]/.test(val) || val.startsWith('"') || val.startsWith("'")) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return val;
}

export function noteToMarkdown(note: Note): string {
  const lines = [
    '---',
    `id: ${yamlValue(note.id)}`,
    `title: ${yamlValue(note.title)}`,
    `sort_order: ${note.sortOrder}`,
    `updated_at: ${note.updatedAt}`,
    '---',
  ];
  if (note.content) {
    lines.push(note.content);
  }
  return lines.join('\n');
}

export function markdownToNote(md: string): Note {
  const fmMatch = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error('Invalid note: missing frontmatter');
  }
  const frontmatter = fmMatch[1];
  const content = fmMatch[2].trim();

  const get = (key: string): string => {
    const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
    const m = frontmatter.match(re);
    if (!m) return '';
    let val = m[1].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return val;
  };

  return {
    id: get('id'),
    title: get('title'),
    sortOrder: parseInt(get('sort_order') || '0', 10),
    updatedAt: get('updated_at'),
    content,
  };
}
