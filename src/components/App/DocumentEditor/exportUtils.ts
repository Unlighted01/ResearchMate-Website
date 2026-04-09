// ============================================
// exportUtils.ts - DOCX & PDF Export Functions
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
}

// ============================================
// PART 3: DOCX EXPORT
// ============================================

function hexToDocxColor(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

type DocxHighlight =
  | "black" | "blue" | "cyan" | "darkBlue" | "darkCyan" | "darkGray"
  | "darkGreen" | "darkMagenta" | "darkRed" | "darkYellow" | "green"
  | "lightGray" | "magenta" | "none" | "red" | "white" | "yellow";

function mapHighlightColor(hex: string): DocxHighlight {
  const map: Record<string, DocxHighlight> = {
    "#FFFF00": "yellow",
    "#00FF00": "green",
    "#00FFFF": "cyan",
    "#FF00FF": "magenta",
    "#FF0000": "red",
    "#0000FF": "blue",
    "#FFA500": "darkYellow",
    "#FFD700": "yellow",
    "#ADFF2F": "green",
    "#87CEEB": "cyan",
    "#DDA0DD": "magenta",
    "#FFC0CB": "magenta",
  };
  return map[hex.toUpperCase()] || "yellow";
}

function extractTextRuns(node: TiptapNode): TextRun[] {
  if (node.text) {
    const marks = node.marks || [];
    const bold = marks.some((m) => m.type === "bold");
    const italic = marks.some((m) => m.type === "italic");
    const strike = marks.some((m) => m.type === "strike");
    const sub = marks.some((m) => m.type === "subscript");
    const sup = marks.some((m) => m.type === "superscript");
    const underline = marks.some((m) => m.type === "underline")
      ? { type: "single" as const }
      : undefined;

    const textStyleMark = marks.find((m) => m.type === "textStyle");
    const highlightMark = marks.find((m) => m.type === "highlight");

    const color = textStyleMark?.attrs?.color
      ? hexToDocxColor(textStyleMark.attrs.color as string)
      : undefined;
    const fontFamily = textStyleMark?.attrs?.fontFamily as string | undefined;
    const fontSize = textStyleMark?.attrs?.fontSize
      ? Math.round(parseFloat(textStyleMark.attrs.fontSize as string) * 2)
      : undefined;
    const highlight = highlightMark?.attrs?.color
      ? mapHighlightColor(highlightMark.attrs.color as string)
      : undefined;

    return [
      new TextRun({
        text: node.text,
        bold,
        italics: italic,
        underline,
        strike,
        subScript: sub,
        superScript: sup,
        color,
        font: fontFamily ? { name: fontFamily.split(",")[0].trim() } : undefined,
        size: fontSize,
        highlight,
      }),
    ];
  }

  if (node.content) {
    return node.content.flatMap(extractTextRuns);
  }

  return [];
}

function getHeadingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    default:
      return HeadingLevel.HEADING_4;
  }
}

function mapAlignment(align: string | undefined): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  if (!align) return undefined;
  const map: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  };
  return map[align];
}

function getIndent(node: TiptapNode): { left?: number } | undefined {
  const level = node.attrs?.indent as number | undefined;
  if (!level) return undefined;
  return { left: level * 720 };
}

function nodeToParagraphs(node: TiptapNode): Paragraph[] {
  const alignment = mapAlignment(node.attrs?.textAlign as string | undefined);
  const indent = getIndent(node);

  switch (node.type) {
    case "heading":
      return [
        new Paragraph({
          children: extractTextRuns(node),
          heading: getHeadingLevel(
            (node.attrs?.level as number) || 1
          ),
          spacing: { before: 240, after: 120 },
          alignment,
          indent,
        }),
      ];

    case "paragraph":
      return [
        new Paragraph({
          children:
            node.content?.length ? extractTextRuns(node) : [new TextRun("")],
          spacing: { after: 120 },
          alignment,
          indent,
        }),
      ];

    case "bulletList":
      return (node.content || []).flatMap((li) =>
        (li.content || []).map(
          (p) =>
            new Paragraph({
              children: extractTextRuns(p),
              bullet: { level: 0 },
              spacing: { after: 60 },
            })
        )
      );

    case "orderedList":
      return (node.content || []).flatMap((li, idx) =>
        (li.content || []).map(
          (p) =>
            new Paragraph({
              children: [
                new TextRun({ text: `${idx + 1}. ` }),
                ...extractTextRuns(p),
              ],
              spacing: { after: 60 },
            })
        )
      );

    case "blockquote":
      return (node.content || []).map(
        (child) =>
          new Paragraph({
            children: extractTextRuns(child),
            indent: { left: 720 },
            border: {
              left: {
                style: BorderStyle.SINGLE,
                size: 6,
                color: "007AFF",
                space: 10,
              },
            },
            spacing: { after: 120 },
          })
      );

    case "horizontalRule":
      return [
        new Paragraph({
          children: [new TextRun({ text: "─".repeat(50) })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
        }),
      ];

    default:
      return [];
  }
}

export async function exportToDocx(
  json: Record<string, unknown>,
  title: string
): Promise<void> {
  const doc = json as unknown as TiptapNode;
  const paragraphs = (doc.content || []).flatMap(nodeToParagraphs);

  const docx = new DocxDocument({
    sections: [
      {
        children: paragraphs.length
          ? paragraphs
          : [new Paragraph({ children: [new TextRun("")] })],
      },
    ],
  });

  const blob = await Packer.toBlob(docx);
  saveAs(blob, `${title}.docx`);
}

// ============================================
// PART 4: PDF EXPORT
// ============================================

export async function exportToPdf(
  editorElementId: string,
  title: string
): Promise<void> {
  const element = document.getElementById(editorElementId);
  if (!element) throw new Error("Editor element not found");

  // Clone and force light mode for clean PDF output
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.width = "794px"; // A4 width at 96 DPI
  clone.style.background = "#ffffff";
  clone.style.color = "#000000";
  clone.style.padding = "40px";
  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth - 20; // 10mm margin each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10; // top margin

    // First page
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 20;

    // Additional pages if content overflows
    while (heightLeft > 0) {
      position = -(pageHeight - 20) + 10;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
    }

    pdf.save(`${title}.pdf`);
  } finally {
    document.body.removeChild(clone);
  }
}
