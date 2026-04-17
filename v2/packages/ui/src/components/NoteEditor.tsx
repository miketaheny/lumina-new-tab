import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import { Markdown } from 'tiptap-markdown';

interface NoteEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  onSave?: () => void;
}

export function NoteEditor({ content, onChange, onSave }: NoteEditorProps) {
  const isInitializing = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Typography,
      Underline,
      Markdown.configure({ html: false, tightLists: true }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      if (isInitializing.current) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const md = (ed.storage as any).markdown?.getMarkdown?.() ?? ed.getHTML();
        onChange(md);
      }, 300);
    },
  });

  // Sync content from outside (switching notes)
  useEffect(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getHTML();
    if (current === content) return;
    isInitializing.current = true;
    editor.commands.setContent(content);
    isInitializing.current = false;
  }, [content, editor]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (editor) onChange((editor.storage as any).markdown?.getMarkdown?.() ?? editor.getHTML());
      onSave?.();
    }
  }, [editor, onChange, onSave]);

  if (!editor) return null;

  const cmd = (command: () => boolean) => { command(); editor.commands.focus(); };

  return (
    <div style={editorWrapStyle} onKeyDown={handleKeyDown}>
      <div style={toolbarStyle}>
        <ToolBtn
          active={editor.isActive('bold')}
          title="Bold (Cmd+B)"
          onClick={() => cmd(() => editor.chain().focus().toggleBold().run())}
        >B</ToolBtn>
        <ToolBtn
          active={editor.isActive('italic')}
          title="Italic (Cmd+I)"
          onClick={() => cmd(() => editor.chain().focus().toggleItalic().run())}
          style={{ fontStyle: 'italic' }}
        >I</ToolBtn>
        <ToolBtn
          active={editor.isActive('underline')}
          title="Underline (Cmd+U)"
          onClick={() => cmd(() => editor.chain().focus().toggleUnderline().run())}
          style={{ textDecoration: 'underline' }}
        >U</ToolBtn>
        <ToolBtn
          active={editor.isActive('strike')}
          title="Strikethrough"
          onClick={() => cmd(() => editor.chain().focus().toggleStrike().run())}
          style={{ textDecoration: 'line-through' }}
        >S</ToolBtn>
        <ToolBtn
          active={editor.isActive('highlight')}
          title="Highlight"
          onClick={() => cmd(() => editor.chain().focus().toggleHighlight().run())}
        >
          <HighlightSvg />
        </ToolBtn>
        <Divider />
        <ToolBtn
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
          onClick={() => cmd(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        >H1</ToolBtn>
        <ToolBtn
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
          onClick={() => cmd(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        >H2</ToolBtn>
        <ToolBtn
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
          onClick={() => cmd(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        >H3</ToolBtn>
        <Divider />
        <ToolBtn
          active={editor.isActive('bulletList')}
          title="Bullet list"
          onClick={() => cmd(() => editor.chain().focus().toggleBulletList().run())}
        >
          <BulletSvg />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('orderedList')}
          title="Ordered list"
          onClick={() => cmd(() => editor.chain().focus().toggleOrderedList().run())}
        >
          <OrderedSvg />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('taskList')}
          title="Task list"
          onClick={() => cmd(() => editor.chain().focus().toggleTaskList().run())}
        >
          <TaskSvg />
        </ToolBtn>
        <Divider />
        <ToolBtn
          active={editor.isActive('blockquote')}
          title="Blockquote"
          onClick={() => cmd(() => editor.chain().focus().toggleBlockquote().run())}
        >
          <QuoteSvg />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('code')}
          title="Inline code"
          onClick={() => cmd(() => editor.chain().focus().toggleCode().run())}
        >
          <CodeSvg />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('codeBlock')}
          title="Code block"
          onClick={() => cmd(() => editor.chain().focus().toggleCodeBlock().run())}
        >
          <CodeBlockSvg />
        </ToolBtn>
        <Divider />
        <ToolBtn
          title="Copy as Markdown"
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const md = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getHTML();
            navigator.clipboard.writeText(md);
          }}
        >
          <CopyMdSvg />
        </ToolBtn>
      </div>
      <EditorContent editor={editor} style={editorContentStyle} />
      <style>{editorCss}</style>
    </div>
  );
}

function ToolBtn({
  children, active, onClick, title, style,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        ...toolBtnStyle,
        ...(active ? toolBtnActiveStyle : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 2px', alignSelf: 'center', flexShrink: 0 }} />;
}

function HighlightSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L4 20l1.5-.5 6.5-3 6.5 3 1.5.5L12 2zm0 4l4.5 11.5-4.5-2.2-4.5 2.2L12 6z" opacity="0.8"/>
    </svg>
  );
}
function BulletSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function OrderedSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
      <path d="M4 6h1v4" strokeWidth="2"/><path d="M4 10h2" strokeWidth="2"/>
      <path d="M6 14H4c0-1 2-1 2-2s-1-1.5-2-1" strokeWidth="1.8"/>
      <path d="M4 19v-1h2v-1H4" strokeWidth="1.8"/>
    </svg>
  );
}
function TaskSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="6" height="6" rx="1"/><polyline points="6 8 7 9 9 7"/>
      <line x1="13" y1="8" x2="21" y2="8"/><line x1="13" y1="16" x2="21" y2="16"/>
      <rect x="3" y="13" width="6" height="6" rx="1"/>
    </svg>
  );
}
function QuoteSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
    </svg>
  );
}
function CodeSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  );
}
function CodeBlockSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="3"/>
      <polyline points="8 10 4 14 8 18"/><polyline points="16 10 20 14 16 18"/>
    </svg>
  );
}

function CopyMdSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

const editorWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 2,
  padding: '6px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  flexShrink: 0,
};

const toolBtnStyle: React.CSSProperties = {
  width: 26,
  height: 24,
  borderRadius: 5,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent',
  color: 'rgba(255,255,255,0.5)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
  fontFamily: 'Inter, sans-serif',
  transition: 'all 0.1s',
  padding: 0,
};

const toolBtnActiveStyle: React.CSSProperties = {
  background: 'rgba(167,139,250,0.15)',
  borderColor: 'rgba(167,139,250,0.4)',
  color: '#c4b5fd',
};

const editorContentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '12px 16px',
};

const editorCss = `
.ProseMirror {
  outline: none;
  min-height: 200px;
  font-family: Inter, system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.65;
  color: rgba(255,255,255,0.82);
  caret-color: #c4b5fd;
}
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: rgba(255,255,255,0.2);
  pointer-events: none;
  height: 0;
}
.ProseMirror h1 { font-size: 1.5em; font-weight: 700; margin: 0.8em 0 0.3em; color: rgba(255,255,255,0.9); }
.ProseMirror h2 { font-size: 1.25em; font-weight: 700; margin: 0.8em 0 0.3em; color: rgba(255,255,255,0.9); }
.ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.3em; color: rgba(255,255,255,0.9); }
.ProseMirror p { margin: 0 0 0.5em; }
.ProseMirror strong { color: rgba(255,255,255,0.95); }
.ProseMirror em { color: rgba(255,255,255,0.8); }
.ProseMirror mark { background: rgba(234,179,8,0.3); color: inherit; padding: 0 2px; border-radius: 2px; }
.ProseMirror code { background: rgba(255,255,255,0.08); border-radius: 4px; padding: 1px 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.88em; color: #a78bfa; }
.ProseMirror pre { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px 14px; overflow-x: auto; margin: 0.5em 0; }
.ProseMirror pre code { background: none; padding: 0; color: rgba(255,255,255,0.82); }
.ProseMirror blockquote { border-left: 3px solid rgba(167,139,250,0.4); padding-left: 10px; margin: 0.5em 0; color: rgba(255,255,255,0.55); font-style: italic; }
.ProseMirror ul { padding-left: 18px; margin: 0.3em 0; }
.ProseMirror ol { padding-left: 18px; margin: 0.3em 0; }
.ProseMirror li { margin-bottom: 0.15em; }
.ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
.ProseMirror ul[data-type="taskList"] li { display: flex; align-items: baseline; gap: 6px; }
.ProseMirror ul[data-type="taskList"] li input[type="checkbox"] { width: 13px; height: 13px; cursor: pointer; accent-color: #a78bfa; flex-shrink: 0; margin-top: 2px; }
.ProseMirror a { color: #818cf8; text-decoration: underline; text-underline-offset: 2px; }
.ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.ProseMirror td, .ProseMirror th { border: 1px solid rgba(255,255,255,0.12); padding: 4px 8px; font-size: 12px; }
.ProseMirror th { background: rgba(255,255,255,0.05); font-weight: 600; }
.ProseMirror hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1em 0; }
`;
