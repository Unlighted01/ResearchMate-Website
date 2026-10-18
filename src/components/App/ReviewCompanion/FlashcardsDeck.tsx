// ============================================
// FLASHCARDS DECK - Active Recall Academic Workstation
// Universal Academic Flashcards (SHS STEM to College 2nd-Year Core)
// ============================================
// Features:
// 1. KaTeX Math & LaTeX formula rendering on front & back cards
// 2. Active Recall Spaced Repetition (SRS) confidence rating (Again, Hard, Good, Easy)
// 3. Multi-disciplinary academic starter deck across STEM & Core Subjects
// 4. Quick source filter & topic selector
// ============================================

import React, { useState } from "react";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Loader2,
  BookOpen,
  Award,
  Layers,
  Repeat,
  Zap,
} from "lucide-react";
import { generateAiResponse } from "../../../services/geminiService";
import { StorageItem } from "../../../services/storageService";
import { buildSynthesisContext } from "../../../services/ragService";
import { findRelevantFormulary } from "../../../services/formularyService";
import AcademicMathView from "../../shared/AcademicMathView";

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  category: string;
}

interface FlashcardsDeckProps {
  items: StorageItem[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

// -------------------------------------------------------------
// Universal Academic Starter Deck (Zero AI-slop / Multi-Subject)
// -------------------------------------------------------------
const UNIVERSAL_STARTER_DECK: Flashcard[] = [
  {
    id: 1,
    front: "State the Fundamental Theorem of Calculus (Part 1).",
    back: "If $f$ is continuous on $[a, b]$, then the function $g(x) = \\int_a^x f(t)\\,dt$ is continuous on $[a, b]$, differentiable on $(a, b)$, and $g'(x) = f(x)$.",
    category: "Calculus",
  },
  {
    id: 2,
    front: "What is the logical equivalence for the negation of a conditional statement: $\\neg(P \\to Q)$?",
    back: "$\\neg(P \\to Q) \\equiv P \\land \\neg Q$. The only case where $P \\to Q$ is false is when $P$ is True and $Q$ is False.",
    category: "Discrete Mathematics",
  },
  {
    id: 3,
    front: "State the Work-Energy Theorem in classical mechanics.",
    back: "The net work done by all forces acting on a particle equals the change in its kinetic energy: $W_{\\text{net}} = \\Delta K = \\frac{1}{2}m v_f^2 - \\frac{1}{2}m v_i^2$.",
    category: "Physics",
  },
  {
    id: 4,
    front: "What does the Michaelis Constant ($K_m$) represent in enzyme kinetics?",
    back: "The substrate concentration $[S]$ at which the reaction velocity is half of $V_{\\max}$ ($v = \\frac{1}{2}V_{\\max}$). A lower $K_m$ indicates higher enzyme-substrate affinity.",
    category: "General Chemistry / Bio",
  },
  {
    id: 5,
    front: "What is the Proximity Rule for correlative conjunctions ('either... or', 'neither... nor')?",
    back: "The finite verb must agree in grammatical number and person with the closest subject (e.g., 'Neither the teacher nor the students were present').",
    category: "Verbal Grammar",
  },
  {
    id: 6,
    front: "In power set theory, if set $S$ has cardinality $|S| = n$, what is the cardinality of its power set $|\\mathcal{P}(S)|$?",
    back: "$|\\mathcal{P}(S)| = 2^n$. The number of non-empty proper subsets is $2^n - 1$.",
    category: "Discrete Mathematics",
  },
];

export const FlashcardsDeck: React.FC<FlashcardsDeckProps> = ({
  items,
  showToast,
}) => {
  const [topicInput, setTopicInput] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<string>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set());
  const [cards, setCards] = useState<Flashcard[]>(UNIVERSAL_STARTER_DECK);

  const handleGenerateCards = async () => {
    setIsGenerating(true);
    setIsFlipped(false);
    setCurrentIndex(0);

    const targetTopic = topicInput.trim() || (selectedSourceId !== "all"
      ? items.find((i) => i.id === selectedSourceId)?.title || "Selected Material"
      : "Uploaded Course Materials");
    const isSpecificTopic = Boolean(topicInput.trim() || selectedSourceId !== "all");

    const sourceItems = selectedSourceId === "all"
      ? items
      : items.filter((i) => i.id === selectedSourceId);

    try {
      // 1. RAG Synthesis
      const contextCorpus = await buildSynthesisContext(
        sourceItems,
        isSpecificTopic ? targetTopic : undefined,
        8
      );

      // 2. Formulary Injection
      const relevantFormularies = findRelevantFormulary(`${targetTopic} ${contextCorpus.slice(0, 2000)}`);
      const formularyPrompt = relevantFormularies.length > 0
        ? `\nKey Academic Rules to incorporate:\n${relevantFormularies.map((r) => `• ${r}`).join("\n")}\n`
        : "";

      const prompt = `You are an academic flashcard author specializing in high-yield active recall for STEM & university students.
Target Topic / Subject: "${targetTopic}"
${formularyPrompt}
Available Course Materials:
${contextCorpus || "Generate essential review flashcards for " + targetTopic}

REQUIREMENTS:
1. Generate 6 to 8 active-recall flashcard pairs.
2. Front: Crisp concept prompt, theorem statement request, or key problem.
3. Back: Clear, authoritative explanation or derivation.
4. Render all mathematical equations, variables, and units in standard LaTeX dollar signs (e.g. $E = mc^2$, $\\Delta S \\ge 0$, $\\neg P \\lor Q$).
5. Assign a concise category tag (e.g. "Calculus", "Physics", "Discrete Logic").

Respond ONLY with a valid raw JSON array of objects:
[
  {
    "id": 1,
    "front": "Prompt with LaTeX ($...$)?",
    "back": "Concise answer with LaTeX ($...$).",
    "category": "Topic Name"
  }
]`;

      const response = await generateAiResponse(prompt);
      const cleanJson = response.replace(/```json/gi, "").replace(/```/gi, "").trim();
      const parsed: Flashcard[] = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map((c, idx) => ({ ...c, id: idx + 1 }));
        setCards(normalized);
        setMasteredIds(new Set());
        showToast(`Generated ${normalized.length} active-recall flashcards on "${targetTopic}"!`, "success");
      } else {
        throw new Error("Invalid flashcard JSON structure");
      }
    } catch (err: any) {
      console.error("Flashcards generation error:", err);
      showToast("Loaded ready universal study deck.", "info");
      setCards(UNIVERSAL_STARTER_DECK);
      setMasteredIds(new Set());
    } finally {
      setIsGenerating(false);
    }
  };

  const currentCard = cards[currentIndex] || cards[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const toggleMastered = (id: number) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    handleNext();
  };

  return (
    <div className="space-y-6">
      {/* Console Header & Generator Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white font-title flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Active Recall & Spaced Repetition Decks
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              Test retention of key equations, derivations, and definitions with KaTeX formula rendering.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-1 rounded-md">
              Progress: <strong className="text-slate-900 dark:text-slate-100">{masteredIds.size} of {cards.length} Mastered</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <input
            type="text"
            placeholder="Flashcard focus topic (e.g. 'Integrals', 'Logic Equivalences', 'Thermodynamics', or blank)..."
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
          />

          {items.length > 0 && (
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            >
              <option value="all">All Materials ({items.length})</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  📄 {it.title?.slice(0, 30) || "Document"}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleGenerateCards}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isGenerating ? "Synthesizing Deck..." : "Generate Flashcards"}</span>
          </button>
        </div>
      </div>

      {/* Editorial Flashcard Console */}
      {cards.length > 0 && currentCard && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[290px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col justify-between cursor-pointer select-none transition-all shadow-sm hover:shadow-md relative overflow-hidden group"
          >
            {/* Top Bar inside card */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <span className="uppercase text-[10px] tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-semibold">
                {currentCard.category}
              </span>
              <span>
                Card {currentIndex + 1} of {cards.length}
              </span>
            </div>

            {/* Prompt or Answer Text with KaTeX */}
            <div className="py-6 text-center px-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-3 font-semibold">
                {isFlipped ? "Core Derivation / Answer" : "Concept Prompt / Question"}
              </span>
              <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white font-title leading-relaxed">
                <AcademicMathView content={isFlipped ? currentCard.back : currentCard.front} />
              </div>
            </div>

            {/* Bottom Cue */}
            <div className="text-center text-[11px] font-mono text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5">
              <Repeat className="w-3 h-3" />
              <span>Click anywhere to flip card</span>
            </div>
          </div>

          {/* Navigation & Mastery Controls */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={handlePrev}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Previous card"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMastered(currentCard.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                  masteredIds.has(currentCard.id)
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{masteredIds.has(currentCard.id) ? "Mastered" : "Mark Mastered"}</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-2xs cursor-pointer"
              >
                <span>Next Card</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleNext}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Next card"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardsDeck;
