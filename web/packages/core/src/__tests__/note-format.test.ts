import { describe, it, expect } from 'vitest';
import { noteToMarkdown, markdownToNote } from '../note-format';
import type { Note } from '../types';

describe('noteToMarkdown', () => {
  it('serializes a note to markdown with frontmatter', () => {
    const note: Note = {
      id: 'note-abc123',
      title: 'Shopping List',
      sortOrder: 2,
      updatedAt: '2026-04-16T10:30:00Z',
      content: '- Eggs\n- Milk',
    };
    const md = noteToMarkdown(note);
    expect(md).toContain('---');
    expect(md).toContain('id: note-abc123');
    expect(md).toContain('title: Shopping List');
    expect(md).toContain('sort_order: 2');
    expect(md).toContain('updated_at: 2026-04-16T10:30:00Z');
    expect(md).toContain('- Eggs\n- Milk');
  });

  it('escapes titles with colons', () => {
    const note: Note = {
      id: 'n1', title: 'Note: important', sortOrder: 0,
      updatedAt: '2026-01-01T00:00:00Z', content: 'body',
    };
    const md = noteToMarkdown(note);
    expect(md).toContain('title: "Note: important"');
  });
});

describe('markdownToNote', () => {
  it('parses markdown with frontmatter into a Note', () => {
    const md = `---
id: note-abc123
title: Shopping List
sort_order: 2
updated_at: 2026-04-16T10:30:00Z
---
- Eggs
- Milk`;
    const note = markdownToNote(md);
    expect(note.id).toBe('note-abc123');
    expect(note.title).toBe('Shopping List');
    expect(note.sortOrder).toBe(2);
    expect(note.updatedAt).toBe('2026-04-16T10:30:00Z');
    expect(note.content).toBe('- Eggs\n- Milk');
  });

  it('handles empty content', () => {
    const md = `---
id: n1
title: Empty
sort_order: 0
updated_at: 2026-01-01T00:00:00Z
---`;
    const note = markdownToNote(md);
    expect(note.content).toBe('');
  });
});
