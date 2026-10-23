// ============================================
// FLASHCARDS DECK - Active Recall Academic Workstation
// Universal Academic Flashcards (SHS STEM to College 2nd-Year Core)
// Dual-Entry: Grounded AI Generation + Manual Card Builder & Editor
// ============================================

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Loader2,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { generateAiResponse } from "../../../services/geminiService";
import { StorageItem } from "../../../services/storageService";
import { buildSynthesisContext } from "../../../services/ragService";
import { findRelevantFormulary } from "../../../services/formularyService";
import { Flashcard, generateUUID, saveFlashcardDeck } from "../../../services/examService";
import { sanitizeCurrencyAndMath } from "../../../services/examParser";
import AcademicMathView from "../../shared/AcademicMathView";
import MaterialScopeSelector, { MaterialScopeSelection } from "./MaterialScopeSelector";

interface FlashcardsDeckProps {
  items: StorageItem[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

// Universal Academic Starter Deck
const UNIVERSAL_STARTER_DECK: Flashcard[] = [
  {
    id: "card-1",
    front: "State the Fundamental Theorem of Calculus (Part 1).",
    back: "If $f$ is continuous on $[a, b]$, then the function $g(x) = \\int_a^x f(t)\\,dt$ is continuous on $[a, b]$, differentiable on $(a, b)$, and $g'(x) = f(x)$.",
    category: "Calculus",
  },
  {
    id: "card-2",
    front: "What is the logical equivalence for the negation of a conditional statement: $\\neg(P \\to Q)$?",
    back: "$\\neg(P \\to Q) \\equiv P \\land \\neg Q$. The only case where $P \\to Q$ is false is when $P$ is True and $Q$ is False.",
    category: "Discrete Mathematics",
  },
  {
    id: "card-3",
    front: "State the Work-Energy Theorem in classical mechanics.",
    back: "The net work done by all forces acting on a particle equals the change in its kinetic energy: $W_{\\text{net}} = \\Delta K = \\frac{1}{2}m v_f^2 - \\frac{1}{2}m v_i^2$.",
    category: "Physics",
  },
  {
    id: "card-4",
    front: "What does the Michaelis Constant ($K_m$) represent in enzyme kinetics?",
    back: "The substrate concentration $[S]$ at which the reaction velocity is half of $V_{\\max}$ ($v = \\frac{1}{2}V_{\\max}$). A lower $K_m$ indicates higher enzyme-substrate affinity.",
    category: "General Chemistry / Bio",
  },
  {
    id: "card-5",
    front: "What is the Proximity Rule for correlative conjunctions ('either... or', 'neither... nor')?",
    back: "The finite verb must agree in grammatical number and person with the closest subject (e.g., 'Neither the teacher nor the students were present').",
    category: "Verbal Grammar",
  },
  {
    id: "card-6",
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
  const [scopeSelection, setScopeSelection] = useState<MaterialScopeSelection>({
    mode: "all",
    selectedIds: [],
  });
  const [cardCount, setCardCount] = useState<10 | 20 | 30>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<Flashcard[]>(UNIVERSAL_STARTER_DECK);

  // Card Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editorFront, setEditorFront] = useState("");
  const [editorBack, setEditorBack] = useState("");
  const [editorCategory, setEditorCategory] = useState("");

  const targetScopeItems = useMemo(() => {
    if (scopeSelection.mode === "all") return items;
    if (scopeSelection.mode === "single") {
      const singleId = scopeSelection.selectedIds[0];
      return items.filter((i) => i.id === singleId);
    }
    return items.filter((i) => scopeSelection.selectedIds.includes(i.id));
  }, [scopeSelection, items]);

  const handleGenerateCards = async (appendCount?: number) => {
    setIsGenerating(true);
    if (!appendCount) {
      setIsFlipped(false);
      setCurrentIndex(0);
    }

    const countToGenerate = appendCount || cardCount;
    const targetTopic = topicInput.trim() || (scopeSelection.mode === "single"
      ? targetScopeItems[0]?.sourceTitle || "Selected Material"
      : "Uploaded Course Materials");

    try {
      // 1. RAG Synthesis
      const contextCorpus = await buildSynthesisContext(
        targetScopeItems,
        targetTopic,
        countToGenerate <= 10 ? 8 : 14
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
1. Generate EXACTLY ${countToGenerate} high-yield active-recall flashcard pairs based STRICTLY on the provided course material excerpts.
2. Grounded Conceptual Contrast: Test distinctions, governing conditions, common exam traps, and specific mechanisms explained in the source text—never superficial dictionary definitions.
3. Front: Focused, thought-provoking prompt, boundary condition inquiry, or conceptual comparison (e.g. "Under what conditions does Theorem X fail?", "What is the physical meaning of [Variable] in [Context]?").
4. Back: Authoritative, step-by-step explanation or formula. Explicitly highlight the core intuition and frequent student misconceptions.
5. LaTeX Standard: Render all mathematical equations, variables, chemical symbols, and units in standard LaTeX ($...$).
6. Assign a concise category tag (e.g. "Calculus", "Physics", "Discrete Logic").

Respond ONLY with a valid raw JSON array of objects:
[
  {
    "front": "Prompt with LaTeX ($...$)?",
    "back": "Concise answer with LaTeX ($...$).",
    "category": "Topic Name"
  }
]`;

      const response = await generateAiResponse(prompt);
      const cleanJson = response.replace(/```json/gi, "").replace(/```/gi, "").trim();
      const parsed: Array<{ front: string; back: string; category?: string }> = JSON.parse(cleanJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized: Flashcard[] = parsed.map((c) => ({
          id: generateUUID(),
          front: sanitizeCurrencyAndMath(c.front || ""),
          back: sanitizeCurrencyAndMath(c.back || ""),
          category: c.category || targetTopic,
        }));

        if (appendCount) {
          setCards((prev) => [...prev, ...normalized]);
          showToast(`Appended +${normalized.length} cards to study deck!`, "success");
        } else {
          setCards(normalized);
          setMasteredIds(new Set());
          showToast(`Generated ${normalized.length} active-recall flashcards on "${targetTopic}"!`, "success");
        }

        // Save to persistent storage
        saveFlashcardDeck({
          title: targetTopic,
          source_item_ids: targetScopeItems.map((i) => i.id),
          cards: appendCount ? [...cards, ...normalized] : normalized,
        }).catch(() => {});
      } else {
        throw new Error("Invalid flashcard JSON structure");
      }
    } catch (err: any) {
      console.error("Flashcards generation error:", err);
      showToast("Loaded ready universal study deck.", "info");
      if (!appendCount) {
        setCards(UNIVERSAL_STARTER_DECK);
        setMasteredIds(new Set());
      }
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

  const toggleMastered = (id: string) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    handleNext();
  };

  // Open Editor Modal for Add / Edit
  const handleOpenEditor = (cardToEdit?: Flashcard) => {
    if (cardToEdit) {
      setEditingCard(cardToEdit);
      setEditorFront(cardToEdit.front);
      setEditorBack(cardToEdit.back);
      setEditorCategory(cardToEdit.category);
    } else {
      setEditingCard(null);
      setEditorFront("");
      setEditorBack("");
      setEditorCategory(topicInput.trim() || "General");
    }
    setIsEditorOpen(true);
  };

  // Save Card from Modal
  const handleSaveCard = () => {
    if (!editorFront.trim() || !editorBack.trim()) {
      showToast("Card Front and Back cannot be empty.", "error");
      return;
    }

    if (editingCard) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === editingCard.id
            ? {
                ...c,
                front: sanitizeCurrencyAndMath(editorFront.trim()),
                back: sanitizeCurrencyAndMath(editorBack.trim()),
                category: editorCategory.trim() || "General",
              }
            : c
        )
      );
      showToast("Flashcard updated!", "success");
    } else {
      const newCard: Flashcard = {
        id: generateUUID(),
        front: sanitizeCurrencyAndMath(editorFront.trim()),
        back: sanitizeCurrencyAndMath(editorBack.trim()),
        category: editorCategory.trim() || "General",
      };
      setCards((prev) => [...prev, newCard]);
      setCurrentIndex(cards.length);
      showToast("Custom flashcard added to deck!", "success");
    }
    setIsEditorOpen(false);
  };

  // Delete Card
  const handleDeleteCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cards.length <= 1) {
      showToast("Deck must have at least one card.", "info");
      return;
    }
    setCards((prev) => prev.filter((c) => c.id !== id));
    setCurrentIndex((prev) => Math.max(0, Math.min(prev, cards.length - 2)));
    setIsFlipped(false);
    showToast("Card removed from deck.", "info");
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

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-1 rounded-md">
              Progress: <strong className="text-slate-900 dark:text-slate-100">{masteredIds.size} of {cards.length} Mastered</strong>
            </span>

            <button
              type="button"
              onClick={() => handleOpenEditor()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Card</span>
            </button>
          </div>
        </div>

        {/* Material Scope Selector Component */}
        <MaterialScopeSelector
          items={items}
          selection={scopeSelection}
          onChange={setScopeSelection}
        />

        {/* Search, Action Toolbar & Deck Length Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <input
            type="text"
            placeholder="Flashcard focus topic (e.g. 'Integrals', 'Logic Equivalences', 'Thermodynamics', or blank)..."
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
          />

          <div className="flex items-center gap-2">
            <select
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value) as any)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            >
              <option value={10}>10 Cards</option>
              <option value={20}>20 Cards</option>
              <option value={30}>30 Cards</option>
            </select>

            <button
              onClick={() => handleGenerateCards()}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isGenerating ? "Synthesizing Deck..." : `Generate ${cardCount} Cards`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Active Flashcard Flipper Presentation                      */}
      {/* ------------------------------------------------------------- */}
      {cards.length > 0 && currentCard && (
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Card Meta Indicator */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Card {currentIndex + 1} of {cards.length}
              </span>
              <span>•</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {currentCard.category || "General"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Edit Card Button */}
              <button
                type="button"
                onClick={() => handleOpenEditor(currentCard)}
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="Edit this card"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {/* Delete Card Button */}
              <button
                type="button"
                onClick={(e) => handleDeleteCard(currentCard.id, e)}
                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                title="Remove this card from deck"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {masteredIds.has(currentCard.id) && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 ml-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mastered
                </span>
              )}
            </div>
          </div>

          {/* Flashcard Flipper Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[260px] sm:min-h-[320px] p-5 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400/50 dark:hover:border-indigo-600/50 transition-all flex flex-col justify-between cursor-pointer select-none relative group"
          >
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="uppercase tracking-widest text-[10px] font-bold">
                {isFlipped ? "Answer / Derivation (Back)" : "Question / Concept Prompt (Front)"}
              </span>
              <span className="text-[11px] text-indigo-500 group-hover:underline">
                Click to flip ↷
              </span>
            </div>

            {/* Card Content with KaTeX Math Rendering */}
            <div className="py-6 text-center text-base sm:text-xl font-medium text-slate-900 dark:text-slate-50 font-title leading-relaxed">
              <AcademicMathView content={isFlipped ? currentCard.back : currentCard.front} />
            </div>

            <div className="flex items-center justify-center text-xs text-slate-400 font-sans">
              <span>{isFlipped ? "Showing verified explanation" : "Click anywhere to reveal solution"}</span>
            </div>
          </div>

          {/* Flipper Controls Bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              onClick={handlePrev}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Active Recall Confidence Scoring */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMastered(currentCard.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                  masteredIds.has(currentCard.id)
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span className="sm:hidden">{masteredIds.has(currentCard.id) ? "Review" : "Mastered"}</span>
                <span className="hidden sm:inline">{masteredIds.has(currentCard.id) ? "Mark as Review Again" : "Got It Right (Mastered)"}</span>
              </button>
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Extender & Reset Deck Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-slate-500 pt-1">
            <button
              type="button"
              onClick={() => handleGenerateCards(10)}
              disabled={isGenerating}
              className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>+ Add 10 More Grounded Cards to Deck</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMasteredIds(new Set());
                setCurrentIndex(0);
                setIsFlipped(false);
                showToast("Deck progress reset.", "info");
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Mastery (0/{cards.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Card Builder / Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-title flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                {editingCard ? "Edit Flashcard" : "Create Custom Flashcard"}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Front (Concept Prompt or Equation)
                </label>
                <textarea
                  rows={3}
                  value={editorFront}
                  onChange={(e) => setEditorFront(e.target.value)}
                  placeholder="e.g. 'State the Work-Energy Theorem in classical mechanics.'"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Back (Solution, Derivation, or Definition)
                </label>
                <textarea
                  rows={4}
                  value={editorBack}
                  onChange={(e) => setEditorBack(e.target.value)}
                  placeholder="e.g. '$W_{\text{net}} = \Delta K = \frac{1}{2}m v_f^2 - \frac{1}{2}m v_i^2$.'"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category Tag
                </label>
                <input
                  type="text"
                  value={editorCategory}
                  onChange={(e) => setEditorCategory(e.target.value)}
                  placeholder="e.g. Physics, Calculus, General Chem..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCard}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{editingCard ? "Update Card" : "Save Flashcard"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardsDeck;
