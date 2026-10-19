import React, { useMemo } from "react";
import katex from "katex";

interface LatexRendererProps {
  content?: string;
  latex?: string;
  className?: string;
  inlineOnly?: boolean;
}

/**
 * Splits text into text segments and LaTeX segments ($...$ and $$...$$),
 * rendering the math with KaTeX.
 */
export const LatexRenderer: React.FC<LatexRendererProps> = ({
  content,
  latex,
  className = "",
  inlineOnly = false,
}) => {
  const effectiveContent = content || latex || "";
  const renderedElements = useMemo(() => {
    if (!effectiveContent) return null;

    // Fast check: does it even contain math delimiters?
    if (!effectiveContent.includes("$") && !effectiveContent.includes("\\begin{")) {
      return <span className="whitespace-pre-wrap">{effectiveContent}</span>;
    }

    const segments: React.ReactNode[] = [];
    let keyIdx = 0;

    // Regex to match $$...$$ (block math) or $...$ (inline math)
    // Avoid matching escaped \$
    const regex = inlineOnly
      ? /(?<!\\)\$([^\$]+?)(?<!\\)\$/gs
      : /(?<!\\)\$\$([^\$]+?)(?<!\\)\$\$|(?<!\\)\$([^\$]+?)(?<!\\)\$/gs;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(effectiveContent)) !== null) {
      const matchStart = match.index;
      const matchEnd = regex.lastIndex;

      // Plain text before match
      if (matchStart > lastIndex) {
        const textBefore = effectiveContent.substring(lastIndex, matchStart);
        segments.push(
          <span key={`text-${keyIdx++}`} className="whitespace-pre-wrap">
            {textBefore}
          </span>
        );
      }

      const isBlock = match[0].startsWith("$$");
      const formula = isBlock ? match[1] : (match[2] || match[1]);

      try {
        const html = katex.renderToString(formula.trim(), {
          displayMode: isBlock,
          throwOnError: false,
          output: "htmlAndMathml",
        });

        if (isBlock) {
          segments.push(
            <div
              key={`math-${keyIdx++}`}
              className="my-3 overflow-x-auto py-2 px-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 text-center font-mono selection:bg-indigo-500/20"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } else {
          segments.push(
            <span
              key={`math-${keyIdx++}`}
              className="inline-block px-1 mx-0.5 rounded bg-slate-100/60 dark:bg-slate-800/60"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
      } catch (err) {
        // Fallback to raw formula if render fails
        segments.push(
          <code
            key={`err-${keyIdx++}`}
            className="px-1.5 py-0.5 text-xs font-mono bg-rose-50 text-rose-600 rounded"
          >
            {match[0]}
          </code>
        );
      }

      lastIndex = matchEnd;
    }

    if (lastIndex < effectiveContent.length) {
      segments.push(
        <span key={`text-${keyIdx++}`} className="whitespace-pre-wrap">
          {effectiveContent.substring(lastIndex)}
        </span>
      );
    }

    return segments;
  }, [effectiveContent, inlineOnly]);

  return <div className={`latex-content leading-relaxed ${className}`}>{renderedElements}</div>;
};

export default LatexRenderer;
