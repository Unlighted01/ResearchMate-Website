// ============================================
// FLASHCARDS DECK - Active Recall Academic Workstation
// Aesthetic: Matches Landing Page Console (Fraunces + Inter + Geist Mono)
// 3D Flip Flashcards synthesized from ingested study materials
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
} from "lucide-react";
import { generateAiResponse } from "../../../services/geminiService";
import { StorageItem } from "../../../services/storageService";
import { buildSynthesisContext } from "../../../services/ragService";

interface Flashcard {
  id: number;
  front: string;
  back: string;
  category: string;
}

interface FlashcardsDeckProps {
  items: StorageItem[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const FlashcardsDeck: React.FC<FlashcardsDeckProps> = ({
  items,
  showToast,
}) => {
  const [topicInput, setTopicInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set());

  const [cards, setCards] = useState<Flashcard[]>([
    {
      id: 1,
      front: "What is the primary thermodynamic condition for an isolated system to reach equilibrium?",
      back: "Its entropy S reaches the absolute global maximum compatible with internal energy U, volume V, and composition N (dS = 0 and d²S < 0).",
      category: "Thermodynamics",
    },
    {
      id: 2,
      front: "Why do Transformer architectures utilize Multi-Head Attention rather than single-head projection?",
      back: "Multi-head attention jointly attends to information from distinct representation subspaces at different positions, preventing a single attention distribution from averaging out specialized tokens.",
      category: "Deep Learning",
    },
    {
      id: 3,
      front: "State the Central Limit Theorem and its foundational assumption.",
      back: "The normalized sum of independent and identically distributed (i.i.d.) random variables with finite variance σ² approaches a standard normal distribution N(0, 1) as sample size n → ∞.",
      category: "Probability & Statistics",
    },
    {
      id: 4,
      front: "What constitutes the Michaelis Constant (Km) in enzyme kinetics?",
      back: "The substrate concentration at which the reaction velocity is half of Vmax. Lower Km signifies higher substrate binding affinity under quasi-steady-state assumptions.",
      category: "Biochemistry",
    },
  ]);

  const handleGenerateCards = async () => {
    setIsGenerating(true);
    setIsFlipped(false);
    setCurrentIndex(0);

    const targetTopic = topicInput.trim() || "Uploaded Course Materials";
    const isSpecificTopic = Boolean(topicInput.trim());

    // Collect context via RAG: retrieve top relevant chunks across library for specific topic,
    // or sample evenly distributed chunks across beginning, middle, and end for general synthesis
    const contextCorpus = await buildSynthesisContext(
      items,
      isSpecificTopic ? targetTopic : undefined,
      6
    );

    const prompt = `You are an academic flashcard author specializing in high-efficiency active recall.
Target Subject / Topic: "${targetTopic}"
Student Materials:
${contextCorpus || targetTopic}

Generate 6 active-recall flashcard pairs. The front should be a crisp question or prompt, and the back should be the concise core explanation or derivation.
Respond ONLY with a valid raw JSON array of objects:
[
  {
    "id": 1,
    "front": "Concept prompt or question?",
    "back": "Clear concise answer / formula derivation.",
    "category": "Topic Name"
  }
]`;

    try {
      const response = await generateAiResponse(prompt);
      const cleanJson = response.replace(/```json/gi, "").replace(/```/gi, "").trim();
      const parsed: Flashcard[] = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setCards(parsed);
        setMasteredIds(new Set());
        showToast(`Generated ${parsed.length} flashcards for "${targetTopic}"!`, "success");
      }
    } catch (err: any) {
      console.error("Flashcards error:", err);
      showToast("Could not generate new cards: " + err.message, "error");
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
              <BookOpen className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              Active Recall Flashcard Decks
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              Test retention of key equations, derivations, and definitions synthesized from your course notes.
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
            placeholder="Flashcard focus topic (e.g. 'Enzyme Kinetics', 'Quantum Mechanics', or leave blank)..."
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans"
          />
          <button
            onClick={handleGenerateCards}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs disabled:opacity-50 shrink-0"
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
            className="min-h-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col justify-between cursor-pointer select-none transition-all shadow-sm hover:shadow-md relative overflow-hidden group"
          >
            {/* Top Bar inside card */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                {currentCard.category}
              </span>
              <span>
                Card {currentIndex + 1} of {cards.length}
              </span>
            </div>

            {/* Prompt or Answer Text */}
            <div className="py-8 text-center px-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-3 font-semibold">
                {isFlipped ? "Core Derivation / Answer" : "Concept Prompt / Question"}
              </span>
              <p className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white font-title leading-relaxed">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            {/* Bottom Cue */}
            <div className="text-center text-[11px] font-mono text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors pt-3 border-t border-slate-100 dark:border-slate-800/80">
              Click anywhere to flip card ↻
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={handlePrev}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 transition-colors shadow-2xs"
              title="Previous card"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMastered(currentCard.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
                  masteredIds.has(currentCard.id)
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-slate-900 dark:border-white shadow-2xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{masteredIds.has(currentCard.id) ? "Mastered" : "Mark Mastered"}</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-850 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-white transition-all shadow-2xs"
              >
                <span>Next Card</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleNext}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 transition-colors shadow-2xs"
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
