import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';
import { useEffect } from 'react';

const RichTextEditor = ({ value, onChange, placeholder = 'Digite aqui...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlock,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentHtml = editor.getHTML();
      if (value !== currentHtml) {
        editor.commands.setContent(value || '', false);
      }
    }
  }, [value, editor]);

  if (!editor) return null;

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL do Link:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="rich-editor-container" style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: 'var(--color-surface)' }}>
      {/* Toolbar */}
      <div className="rich-editor-toolbar" style={{ display: 'flex', gap: 4, padding: '6px 10px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn-toolbar${editor.isActive('bold') ? ' active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito"
          style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: editor.isActive('bold') ? 'var(--color-primary)' : 'transparent', color: editor.isActive('bold') ? '#fff' : 'inherit', cursor: 'pointer', fontWeight: 700 }}
        >
          B
        </button>
        <button
          type="button"
          className={`btn-toolbar${editor.isActive('italic') ? ' active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico"
          style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: editor.isActive('italic') ? 'var(--color-primary)' : 'transparent', color: editor.isActive('italic') ? '#fff' : 'inherit', cursor: 'pointer', fontStyle: 'italic', fontWeight: 700 }}
        >
          I
        </button>
        <button
          type="button"
          className={`btn-toolbar${editor.isActive('bulletList') ? ' active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista de Marcadores"
          style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: editor.isActive('bulletList') ? 'var(--color-primary)' : 'transparent', color: editor.isActive('bulletList') ? '#fff' : 'inherit', cursor: 'pointer' }}
        >
          • Lista
        </button>
        <button
          type="button"
          className={`btn-toolbar${editor.isActive('orderedList') ? ' active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista Numerada"
          style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: editor.isActive('orderedList') ? 'var(--color-primary)' : 'transparent', color: editor.isActive('orderedList') ? '#fff' : 'inherit', cursor: 'pointer' }}
        >
          1. Lista
        </button>
        <button
          type="button"
          className={`btn-toolbar${editor.isActive('link') ? ' active' : ''}`}
          onClick={addLink}
          title="Inserir Link"
          style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: editor.isActive('link') ? 'var(--color-primary)' : 'transparent', color: editor.isActive('link') ? '#fff' : 'inherit', cursor: 'pointer' }}
        >
          🌐 Link
        </button>
        <button
          type="button"
          className={`btn-toolbar${editor.isActive('codeBlock') ? ' active' : ''}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Bloco de Código"
          style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: editor.isActive('codeBlock') ? 'var(--color-primary)' : 'transparent', color: editor.isActive('codeBlock') ? '#fff' : 'inherit', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          &lt;/&gt;
        </button>
      </div>

      <div style={{ padding: '12px 14px', minHeight: 140 }}>
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>
    </div>
  );
};

export default RichTextEditor;
