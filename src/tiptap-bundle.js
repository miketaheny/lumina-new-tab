import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import { Extension } from '@tiptap/core';

/**
 * Creates and mounts a Tiptap editor.
 * @param {HTMLElement} element - Mount point (becomes the editor wrapper)
 * @param {object} options
 * @param {function} options.onChange - Called on every content update
 * @param {function} options.onSave   - Called on Cmd/Ctrl+S
 * @returns {Editor}
 */
window.initTiptapEditor = function (element, { onChange, onSave } = {}) {
  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // History included via StarterKit (depth 100 by default)
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Underline,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Subscript,
      Superscript,
      Typography,
      Table.configure({ resizable: false, HTMLAttributes: { class: 'tiptap-table' } }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: '-',
        transformPastedText: true,
        transformCopiedText: false,
      }),
      // tiptap-markdown's tight-lists only covers bulletList/orderedList — add taskList
      Extension.create({
        name: 'taskListTight',
        addGlobalAttributes() {
          return [{
            types: ['taskList'],
            attributes: {
              tight: {
                default: true,
                parseHTML: el => el.getAttribute('data-tight') === 'true' || !el.querySelector('p'),
                renderHTML: attrs => ({
                  'data-tight': attrs.tight ? 'true' : null,
                }),
              },
            },
          }];
        },
      }),
    ],
    content: '',
    autofocus: false,
    onUpdate({ editor }) {
      if (onChange) onChange(editor);
    },
  });

  // Custom keyboard shortcuts on top of StarterKit defaults
  editor.view.dom.addEventListener('keydown', e => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;

    if (e.key === 's') {
      e.preventDefault();
      if (onSave) onSave(editor);
      return;
    }
    // Headings: Cmd+1 / Cmd+2 / Cmd+3
    if (e.key === '1') { e.preventDefault(); editor.chain().toggleHeading({ level: 1 }).run(); return; }
    if (e.key === '2') { e.preventDefault(); editor.chain().toggleHeading({ level: 2 }).run(); return; }
    if (e.key === '3') { e.preventDefault(); editor.chain().toggleHeading({ level: 3 }).run(); return; }
    // Bullet list: Cmd+L
    if (!e.shiftKey && e.key.toLowerCase() === 'l') { e.preventDefault(); editor.chain().toggleBulletList().run(); return; }
    // Task list: Cmd+Shift+C
    if (e.shiftKey && e.key.toLowerCase() === 'c') { e.preventDefault(); editor.chain().toggleTaskList().run(); return; }
    // Inline code: Cmd+E
    if (!e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); editor.chain().toggleCode().run(); return; }
    // Link: Cmd+K
    if (!e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const prev = editor.getAttributes('link').href ?? '';
      const url = window.prompt('URL:', prev || 'https://');
      if (url === null) return;
      if (!url) { editor.chain().focus().unsetLink().run(); return; }
      editor.chain().focus().setLink({ href: url }).run();
      return;
    }
  });

  return editor;
};
