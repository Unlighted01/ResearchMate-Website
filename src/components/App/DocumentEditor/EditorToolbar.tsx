// ============================================
// EditorToolbar.tsx - Google Docs-Style Formatting Toolbar
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  FileText,
  Minus,
  Printer,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  Outdent,
  Subscript,
  Superscript,
  ChevronDown,
  Type,
  Highlighter,
  Loader2,
} from "lucide-react";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface EditorToolbarProps {
  editor: Editor | null;
  onInsertItem: () => void;
  onExport: (format: "docx" | "pdf") => void;
  saving: boolean;
}

// ============================================
// PART 3: CONSTANTS
// ============================================

const TEXT_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#B7B7B7",
  "#D9D9D9", "#EFEFEF", "#F3F3F3", "#FFFFFF", "#FF0000",
  "#FF9900", "#FFFF00", "#00FF00", "#00FFFF", "#4A86E8",
  "#0000FF", "#9900FF", "#FF00FF", "#980000", "#FF6600",
];

const HIGHLIGHT_COLORS = [
  "#FFFF00", "#00FF00", "#00FFFF", "#FF00FF", "#FF0000",
  "#0000FF", "#FFA500", "#FFD700", "#ADFF2F", "#87CEEB",
  "#DDA0DD", "#FFC0CB", "#F0E68C", "#98FB98", "#B0E0E6",
  "#D8BFD8", "#FFDAB9", "#E6E6FA", "#FFE4E1", "#F5F5DC",
];

const FONT_FAMILIES = [
  { label: "Sans Serif", value: "Inter, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Monospace", value: "JetBrains Mono, monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "Times New Roman, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Courier New", value: "Courier New, monospace" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const BLOCK_TYPES = [
  { label: "Normal text", value: "paragraph" },
  { label: "Heading 1", value: "heading-1" },
  { label: "Heading 2", value: "heading-2" },
  { label: "Heading 3", value: "heading-3" },
];

// ============================================
// PART 4: HELPER HOOKS & SUB-COMPONENTS
// ============================================

// ---------- PART 4A: FORCE RE-RENDER ON EDITOR TRANSACTIONS ----------

function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((t) => t + 1), []);
}

// ---------- PART 4B: CLICK-OUTSIDE HOOK ----------

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose, ref]);
}

// ---------- PART 4C: TOOLBAR BUTTON ----------

const ToolbarBtn: React.FC<{
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, active, disabled, title, children }) => (
  <button
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-md transition-colors shrink-0 ${
      active
        ? "bg-[#007AFF]/15 text-[#007AFF]"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
    } disabled:opacity-30 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

// ---------- PART 4D: DIVIDER ----------

const Divider = () => (
  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />
);

// ============================================
// PART 5: MAIN COMPONENT
// ============================================

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onInsertItem,
  onExport,
  saving,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const forceUpdate = useForceUpdate();

  // Re-render toolbar on every editor transaction so active states update
  useEffect(() => {
    if (!editor) return;
    editor.on("transaction", forceUpdate);
    return () => {
      editor.off("transaction", forceUpdate);
    };
  }, [editor, forceUpdate]);

  const toggleDropdown = useCallback((name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  }, []);

  // Refs for click-outside
  const blockTypeRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const textColorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useClickOutside(blockTypeRef, openDropdown === "blockType", () => setOpenDropdown(null));
  useClickOutside(fontFamilyRef, openDropdown === "fontFamily", () => setOpenDropdown(null));
  useClickOutside(fontSizeRef, openDropdown === "fontSize", () => setOpenDropdown(null));
  useClickOutside(textColorRef, openDropdown === "textColor", () => setOpenDropdown(null));
  useClickOutside(highlightRef, openDropdown === "highlight", () => setOpenDropdown(null));
  useClickOutside(exportRef, showExport, () => setShowExport(false));

  if (!editor) return null;

  // ---------- PART 5A: DERIVED STATE ----------

  const currentBlockType = editor.isActive("heading", { level: 1 })
    ? "Heading 1"
    : editor.isActive("heading", { level: 2 })
    ? "Heading 2"
    : editor.isActive("heading", { level: 3 })
    ? "Heading 3"
    : "Normal text";

  const currentFont =
    editor.getAttributes("textStyle").fontFamily || "";
  const currentFontLabel =
    FONT_FAMILIES.find((f) => f.value === currentFont)?.label || "Sans Serif";

  const rawFontSize = editor.getAttributes("textStyle").fontSize;
  const currentFontSize = rawFontSize ? parseInt(rawFontSize) : 16;

  const currentTextColor = editor.getAttributes("textStyle").color || undefined;
  const currentHighlight = editor.getAttributes("highlight").color || undefined;

  // ---------- PART 5B: HANDLERS ----------

  const handleBlockTypeSelect = (value: string) => {
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = parseInt(value.split("-")[1]) as 1 | 2 | 3;
      editor.chain().focus().toggleHeading({ level }).run();
    }
    setOpenDropdown(null);
  };

  const handleFontFamilySelect = (value: string) => {
    editor.chain().focus().setFontFamily(value).run();
    setOpenDropdown(null);
  };

  const setFontSize = (size: number) => {
    const clamped = Math.max(8, Math.min(72, size));
    editor.chain().focus().setFontSize(`${clamped}px`).run();
  };

  // ---------- PART 5C: RENDER ----------

  return (
    <div className="flex items-center flex-nowrap gap-0.5 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-sm relative z-20">
      {/* ---- Undo / Redo / Print ---- */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => window.print()} title="Print (Ctrl+P)">
        <Printer className="w-4 h-4" />
      </ToolbarBtn>

      <Divider />

      {/* ---- Block Type Dropdown ---- */}
      <div className="relative shrink-0" ref={blockTypeRef}>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleDropdown("blockType")}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-[110px]"
        >
          <span className="truncate">{currentBlockType}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        </button>
        {openDropdown === "blockType" && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[60] overflow-hidden">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleBlockTypeSelect(bt.value)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  currentBlockType === bt.label
                    ? "bg-[#007AFF]/10 text-[#007AFF]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <span
                  className={
                    bt.value === "heading-1"
                      ? "text-xl font-bold"
                      : bt.value === "heading-2"
                      ? "text-lg font-semibold"
                      : bt.value === "heading-3"
                      ? "text-base font-medium"
                      : "text-sm"
                  }
                >
                  {bt.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* ---- Font Family Dropdown ---- */}
      <div className="relative shrink-0" ref={fontFamilyRef}>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleDropdown("fontFamily")}
          className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-[100px]"
        >
          <span className="truncate">{currentFontLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        </button>
        {openDropdown === "fontFamily" && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[60] overflow-hidden max-h-64 overflow-y-auto">
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFontFamilySelect(f.value)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  currentFont === f.value
                    ? "bg-[#007AFF]/10 text-[#007AFF]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---- Font Size ---- */}
      <div className="relative flex items-center shrink-0" ref={fontSizeRef}>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setFontSize(currentFontSize - 1)}
          className="p-1 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Decrease font size"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleDropdown("fontSize")}
          className="w-9 text-center text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md py-1 transition-colors"
          title="Font size"
        >
          {currentFontSize}
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setFontSize(currentFontSize + 1)}
          className="p-1 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Increase font size"
        >
          <span className="text-sm font-bold leading-none">+</span>
        </button>
        {openDropdown === "fontSize" && (
          <div className="absolute top-full left-0 mt-1 w-20 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[60] overflow-hidden max-h-52 overflow-y-auto">
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setFontSize(size);
                  setOpenDropdown(null);
                }}
                className={`w-full text-center px-2 py-1.5 text-sm transition-colors ${
                  currentFontSize === size
                    ? "bg-[#007AFF]/10 text-[#007AFF]"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* ---- Bold / Italic / Underline / Strikethrough ---- */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <Underline className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarBtn>

      {/* ---- Text Color ---- */}
      <div className="relative shrink-0" ref={textColorRef}>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleDropdown("textColor")}
          title="Text color"
          className="flex flex-col items-center p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Type className="w-4 h-4" />
          <div
            className="w-4 h-0.5 rounded-full mt-0.5"
            style={{ backgroundColor: currentTextColor || "#000000" }}
          />
        </button>
        {openDropdown === "textColor" && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[60] grid grid-cols-5 gap-1 w-[140px]">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setColor(color).run();
                  setOpenDropdown(null);
                }}
                className={`w-5 h-5 rounded-sm border transition-transform hover:scale-125 ${
                  currentTextColor === color
                    ? "border-[#007AFF] ring-1 ring-[#007AFF]"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                setOpenDropdown(null);
              }}
              className="col-span-5 mt-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* ---- Highlight ---- */}
      <div className="relative shrink-0" ref={highlightRef}>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggleDropdown("highlight")}
          title="Highlight color"
          className="flex flex-col items-center p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Highlighter className="w-4 h-4" />
          <div
            className="w-4 h-0.5 rounded-full mt-0.5"
            style={{ backgroundColor: currentHighlight || "transparent" }}
          />
        </button>
        {openDropdown === "highlight" && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[60] grid grid-cols-5 gap-1 w-[140px]">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().toggleHighlight({ color }).run();
                  setOpenDropdown(null);
                }}
                className={`w-5 h-5 rounded-sm border transition-transform hover:scale-125 ${
                  currentHighlight === color
                    ? "border-[#007AFF] ring-1 ring-[#007AFF]"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                setOpenDropdown(null);
              }}
              className="col-span-5 mt-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <Divider />

      {/* ---- Subscript / Superscript ---- */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        active={editor.isActive("subscript")}
        title="Subscript"
      >
        <Subscript className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        active={editor.isActive("superscript")}
        title="Superscript"
      >
        <Superscript className="w-4 h-4" />
      </ToolbarBtn>

      <Divider />

      {/* ---- Alignment ---- */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Align left"
      >
        <AlignLeft className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Align center"
      >
        <AlignCenter className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Align right"
      >
        <AlignRight className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        title="Justify"
      >
        <AlignJustify className="w-4 h-4" />
      </ToolbarBtn>

      <Divider />

      {/* ---- Indent / Outdent ---- */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().decreaseIndent().run()}
        title="Decrease indent"
      >
        <Outdent className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().increaseIndent().run()}
        title="Increase indent"
      >
        <Indent className="w-4 h-4" />
      </ToolbarBtn>

      <Divider />

      {/* ---- Lists / Block Elements ---- */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered list"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
      >
        <Minus className="w-4 h-4" />
      </ToolbarBtn>

      {/* ---- Spacer ---- */}
      <div className="flex-1 min-w-[8px]" />

      {/* ---- Save indicator (fixed width so layout doesn't shift) ---- */}
      <span className={`flex items-center gap-1 text-xs mr-2 shrink-0 w-[60px] transition-opacity ${saving ? "text-gray-400 opacity-100" : "opacity-0"}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving
      </span>

      {/* ---- Insert Research ---- */}
      <button
        onClick={onInsertItem}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors shrink-0"
      >
        <FileText className="w-4 h-4" />
        <span className="hidden sm:inline">Insert</span>
      </button>

      {/* ---- Export dropdown ---- */}
      <div className="relative shrink-0" ref={exportRef}>
        <button
          onClick={() => setShowExport((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#007AFF] text-white rounded-lg hover:bg-[#0066DD] transition-colors"
        >
          Export
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {showExport && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-[60]">
            <button
              onClick={() => {
                onExport("docx");
                setShowExport(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-xl transition-colors"
            >
              Export as .docx
            </button>
            <button
              onClick={() => {
                onExport("pdf");
                setShowExport(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-b-xl transition-colors"
            >
              Export as .pdf
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// PART 6: EXPORTS
// ============================================

export default EditorToolbar;
