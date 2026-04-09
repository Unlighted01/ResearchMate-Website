// ============================================
// EditorCanvas.tsx - Tiptap Editor Content Wrapper
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import FontFamily from "@tiptap/extension-font-family";
import FontSize from "./extensions/fontSize";
import Indent from "./extensions/indent";
import { Editor } from "@tiptap/react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface EditorCanvasProps {
  content: Record<string, unknown>;
  onEditorReady: (editor: Editor) => void;
  onContentChange: (content: Record<string, unknown>) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  content,
  onEditorReady,
  onContentChange,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExt,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      FontFamily,
      FontSize,
      Indent,
      Placeholder.configure({
        placeholder: "Start writing your research document...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none min-h-[60vh] px-8 py-6",
      },
      handleDOMEvents: {
        drop: (_view, event) => {
          event.preventDefault();
          return true;
        },
        dragstart: (_view, event) => {
          event.preventDefault();
          return true;
        },
      },
    },
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);

  // Update editor content when switching documents
  useEffect(() => {
    if (editor && content) {
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(content);
      if (currentJSON !== newJSON) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1C1C1E]" id="editor-canvas">
      <EditorContent editor={editor} />
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default EditorCanvas;
