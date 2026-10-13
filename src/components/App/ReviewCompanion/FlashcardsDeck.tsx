// ============================================
// FLASHCARDS DECK - Active Recall Study Tool
// 3D Flip Flashcards generated from uploaded review materials
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
      front: "What is the primary condition for an isolated system to reach thermodynamic equilibrium?",
      back: "Its entropy must reach the absolute global maximum compatible with its internal energy, volume, and composition.",
      category: "Thermodynamics",
    },
    {
      id: 2,
      front: "Why do Transformer architectures utilize Multi-Head Attention rather than a single attention head?",
      back: "Multi-head attention jointly attends to information from different representation subspaces at different positions, preventing a single average from diluting focused relationships.",
      category: "Deep Learning",
    },
    {
      id: 3,
      front: "State the Central Limit Theorem and its core assumption.",
      back: "The normalized sum of independent and identically distributed (i.i.d.) random variables with finite variance approaches a standard normal distribution as sample size n -> infinity.",
      category: "Probability & Statistics",
    },
    {
      id: 4,
      front: "What constitutes the Michaelis Constant (Km) in enzyme kinetics?",
      back: "The substrate concentration at which the reaction velocity is half of Vmax. A lower Km indicates higher substrate affinity.",
      category: "Biochemistry",
    },
  ]);

  const handleGenerateCards = async () => {
    setIsGenerating(true);
    setIsFlipped(false);
    setCurrentIndex(0);

    const contextCorpus = items
      .slice(0, 8)
      .map((item) => `${item.sourceTitle}: ${item.aiSummary || item.text || ""}`)
      .join("\n\n")
      .slice(0, 10000);

    const targetTopic = topicInput.trim() || "Uploaded Course Materials";

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
      {/* Header & Generator Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white font-title flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Active Recall Flashcard Decks
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              Test your retention on key equations, mechanisms, and textbook concepts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md">
              {masteredIds.size} of {cards.length} Mastered
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <input
            type="text"
            placeholder="Flashcard topic focus (e.g. 'Enzyme Kinetics', 'Quantum Mechanics')..."
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleGenerateCards}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-xs disabled:opacity-50 shrink-0"
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

      {/* Interactive 3D Flip Card Container */}
      {cards.length > 0 && currentCard && (
        <div className="max-w-xl mx-auto space-y-4">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[260px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-8 flex flex-col justify-between cursor-pointer select-none transition-all shadow-md hover:shadow-lg relative overflow-hidden group"
          >
            {/* Top Category Badge */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {currentCard.category}
              </span>
              <span>
                Card {currentIndex + 1} of {cards.length}
              </span>
            </div>

            {/* Main Question or Answer Content */}
            <div className="py-6 text-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-2 font-semibold">
                {isFlipped ? "Answer / Derivation" : "Prompt / Question"}
              </span>
              <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white font-title leading-relaxed">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            {/* Bottom Flip Hint */}
            <div className="text-center text-[11px] font-mono text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Click anywhere to flip card ↻
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 transition-colors"
              title="Previous card"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMastered(currentCard.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  masteredIds.has(currentCard.id)
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{masteredIds.has(currentCard.id) ? "Mastered" : "Mark Mastered"}</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-850 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleNext}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 transition-colors"
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
