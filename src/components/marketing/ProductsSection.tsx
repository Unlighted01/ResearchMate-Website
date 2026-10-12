import React from "react";
import { Link } from "react-router-dom";
import {
  Smartphone,
  PenTool,
  ArrowRight,
  Chrome,
  Globe,
  Check,
  Download,
  ExternalLink,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  status: string;
  features: string[];
  cta: string;
  ctaLink: string;
}

const PRODUCTS: Product[] = [
  {
    id: "extension",
    name: "Browser Extension",
    tagline: "Instant Web & ArXiv Ingestion",
    description:
      "Capture preprints, annotate web articles, and generate structured citation cards directly from Chrome, Firefox, or Edge.",
    icon: Chrome,
    status: "Available",
    features: [
      "1-Click ArXiv & PubMed ingestion",
      "Inline text highlight and marginalia",
      "BibTeX metadata auto-parsing",
      "Real-time cloud sync",
      "Keyboard shortcuts (Cmd+Shift+S)",
    ],
    cta: "Add to Chrome",
    ctaLink:
      "https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh",
  },
  {
    id: "mobile",
    name: "Mobile App & Camera OCR",
    tagline: "Physical Literature Capture",
    description:
      "Turn your smartphone into a high-resolution document scanner for physical textbooks, journal prints, and seminar notes.",
    icon: Smartphone,
    status: "Available",
    features: [
      "Camera scan with auto edge-detection",
      "OCR text and formula transcription",
      "Pair code synchronization",
      "Offline reading support",
      "Instant inbox queue",
    ],
    cta: "Open Mobile Portal",
    ctaLink: "/mobile-sync",
  },
  {
    id: "smartpen",
    name: "Handwriting OCR & Vision",
    tagline: "Analog Notes to Digital Markdown",
    description:
      "Bridge paper notebooks and digital synthesis. Transcribe handwritten notes, chemical diagrams, and equations into searchable LaTeX.",
    icon: PenTool,
    status: "Available",
    features: [
      "Smart pen ink stroke parsing",
      "Mathematical LaTeX extraction",
      "Indexed by note page number",
      "Searchable handwriting index",
      "Export to TipTap documents",
    ],
    cta: "Scan Notes",
    ctaLink: "/mobile-sync",
  },
  {
    id: "web",
    name: "Web Workspace",
    tagline: "Academic Command Center",
    description:
      "The primary environment for literature analysis. Dual-column PDF reader, connected citation graph, and TipTap document editor.",
    icon: Globe,
    status: "Available",
    features: [
      "Full-featured PDF annotator",
      "Interactive knowledge graph",
      "Smart tag taxonomy",
      "Export to PDF, DOCX & BibTeX",
      "End-to-end data encryption",
    ],
    cta: "Open Workspace",
    ctaLink: "/app/dashboard",
  },
];

const ProductsSection: React.FC = () => {
  return (
    <section id="products" className="scroll-mt-12 py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Editorial Header */}
      <div className="max-w-3xl mb-14">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-title font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1] mb-4">
          Integrated tools across your research lifecycle.
        </h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-[65ch]">
          Whether annotating preprints at your desk or digitizing handwritten lab notes on the go, ResearchMate synchronizes every finding.
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {PRODUCTS.map((product) => {
          const Icon = product.icon;
          return (
            <div
              key={product.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-7 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex items-center justify-center border border-slate-200/80 dark:border-slate-700">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-200/50 dark:border-emerald-800/50">
                    {product.status}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 font-title mb-1">
                  {product.name}
                </h3>
                <p className="text-xs font-mono text-slate-500 mb-3">
                  {product.tagline}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  {product.description}
                </p>

                <div className="space-y-2 mb-8 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {product.features.map((feature, fIdx) => (
                    <div
                      key={fIdx}
                      className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div>
                {product.ctaLink.startsWith("/") ? (
                  <Link
                    to={product.ctaLink}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 active:scale-[0.98] transition-all shadow-xs"
                  >
                    <span>{product.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <a
                    href={product.ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 active:scale-[0.98] transition-all shadow-xs"
                  >
                    <span>{product.cta}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Extension Spotlight Banner */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-8 sm:p-10 border border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl">
          <h3 className="text-2xl font-title font-semibold mb-3 text-white">
            Ingest papers without leaving ArXiv or Nature.
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed font-sans mb-6">
            The ResearchMate browser extension parses citations, downloads open-access PDFs, and indexes key equations directly from your active browser tab.
          </p>
          <a
            href="https://chromewebstore.google.com/detail/researchmate/decekloddlffcnegkfbkfngkjikfchoh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-slate-950 font-medium text-xs hover:bg-slate-100 active:scale-[0.98] transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Install Chrome Extension (Free)</span>
          </a>
        </div>

        <div className="w-full md:w-72 bg-slate-800/80 rounded-xl p-5 border border-slate-700/80 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700">
            <span className="text-slate-400">Extension Status</span>
            <span className="text-emerald-400">Active v1.4</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-300">
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ArXiv auto-PDF extraction
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Direct BibTeX clipboard sync
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Encrypted cloud queue
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
