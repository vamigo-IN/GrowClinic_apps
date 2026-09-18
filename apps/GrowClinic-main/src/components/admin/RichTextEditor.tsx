"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ImageResize from "tiptap-extension-resize-image";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3, 
  Code, 
  RotateCcw, 
  RotateCw, 
  Type,
  Code2,
  Upload
} from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/ToastProvider";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const MenuBar = ({ editor, onToggleHtml, isHtmlMode }: { editor: any, onToggleHtml: () => void, isHtmlMode: boolean }) => {
  if (!editor) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const addLink = useCallback(() => {
    const url = window.prompt("Enter URL");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      editor.chain().focus().setImage({ src: data.url }).run();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast("Failed to upload image. Please try again.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addImageUrl = useCallback(() => {
    const url = window.prompt("Enter Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const TooltipButton = ({ 
    onClick, 
    isActive, 
    disabled, 
    children, 
    title 
  }: { 
    onClick: () => void, 
    isActive?: boolean, 
    disabled?: boolean, 
    children: React.ReactNode, 
    title: string 
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition-all ${
        isActive 
          ? "bg-primary text-white" 
          : "text-[var(--a-text)] hover:bg-[var(--a-hover)]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--a-border)] bg-[var(--a-bg)]/50 backdrop-blur-sm sticky top-0 z-10 w-full overflow-x-auto">
      <TooltipButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <Bold size={18} />
      </TooltipButton>
      <TooltipButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <Italic size={18} />
      </TooltipButton>
      <TooltipButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline"
      >
        <UnderlineIcon size={18} />
      </TooltipButton>
      
      <div className="w-px h-6 bg-gray-300 mx-1" />
      
      <TooltipButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={18} />
      </TooltipButton>
      <TooltipButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={18} />
      </TooltipButton>
      <TooltipButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={18} />
      </TooltipButton>

      <div className="w-px h-6 bg-gray-300 mx-1" />
      
      <TooltipButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List size={18} />
      </TooltipButton>
      <TooltipButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Ordered List"
      >
        <ListOrdered size={18} />
      </TooltipButton>
      <TooltipButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Code Block"
      >
        <Code size={18} />
      </TooltipButton>

      <div className="w-px h-6 bg-gray-300 mx-1" />
      
      <TooltipButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <Type size={18} />
      </TooltipButton>
      <TooltipButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <Type size={18} />
      </TooltipButton>
      <TooltipButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={editor.isActive({ textAlign: 'justify' })}
        title="Justify"
      >
        <Type size={18} />
      </TooltipButton>
      
      <div className="w-px h-6 bg-gray-300 mx-1 whitespace-nowrap" />

      <TooltipButton
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Upload Image"
      >
        {uploading ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Upload size={18} />}
      </TooltipButton>

      <TooltipButton
        onClick={addImageUrl}
        title="Add Image via URL"
      >
        <ImageIcon size={18} />
      </TooltipButton>

      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />
      
      <TooltipButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <RotateCcw size={18} />
      </TooltipButton>
      <TooltipButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <RotateCw size={18} />
      </TooltipButton>

      <div className="flex-grow" />
      
      <TooltipButton
        onClick={onToggleHtml}
        isActive={isHtmlMode}
        title="HTML Editor"
      >
        <Code2 size={18} />
      </TooltipButton>
    </div>
  );
};

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline font-medium",
        },
      }),
      ImageResize.configure({
        inline: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph", "image"],
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate prose-lg max-w-none p-4 focus:outline-none min-h-[400px] prose-img:rounded-[15px] prose-img:border prose-img:border-[var(--a-border)] prose-img:shadow-sm prose-img:cursor-pointer",
      },
    },
  });

  const handleToggleHtml = () => {
    setIsHtmlMode(!isHtmlMode);
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    onChange(newHtml);
    if (editor) {
      editor.commands.setContent(newHtml);
    }
  };

  return (
    <div className="bg-[var(--a-panel)] border border-[var(--a-border)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
      <MenuBar 
        editor={editor} 
        onToggleHtml={handleToggleHtml} 
        isHtmlMode={isHtmlMode} 
      />
      {isHtmlMode ? (
        <textarea
          className="w-full min-h-[400px] p-4 font-mono text-sm bg-gray-900 text-gray-100 focus:outline-none resize-y"
          value={content}
          onChange={handleHtmlChange}
          placeholder="Enter raw HTML here..."
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
