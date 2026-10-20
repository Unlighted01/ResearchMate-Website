// ============================================
// ACADEMIC MATH VIEW - KaTeX & Markdown Math Renderer
// ============================================
// Renders LaTeX equations ($...$ and $$...$$), Markdown tables,
// code blocks, and academic typography with zero-crash error handling.
// ============================================

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface AcademicMathViewProps {
  content?: string;
  text?: string;
  className?: string;
  inline?: boolean;
}

export const AcademicMathView: React.FC<AcademicMathViewProps> = ({
  content,
  text,
  className = "",
  inline = false,
}) => {
  const rawText = content || text || "";
  if (!rawText) return null;

  // Pre-process common raw LaTeX anomalies if needed (e.g., KaTeX bracket formatting)
  const normalizedContent = rawText
    .replace(/\\\[/g, "$$\n")
    .replace(/\\\]/g, "\n$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");

  return (
    <div className={`academic-math-view leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ node, ...props }) => (
            <p className={inline ? "inline m-0" : "my-1 leading-relaxed"} {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs text-left" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-1.5 bg-slate-100 dark:bg-slate-850 font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/60" {...props} />
          ),
          code: ({ node, className: codeClass, children, ...props }: any) => {
            const isBlock = Boolean(codeClass && codeClass.includes("language-"));
            return isBlock ? (
              <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[11px] font-mono my-2">
                <code {...props}>{children}</code>
              </pre>
            ) : (
              <code className="bg-slate-100 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded text-[11px] font-mono" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};

export default AcademicMathView;
