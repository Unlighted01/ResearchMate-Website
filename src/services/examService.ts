// ============================================
// EXAM SERVICE - Universal Exam Simulator & Editor
// Handles Local-First Storage, Supabase Cloud Sync,
// Immutability Snapshots, and Multi-Batch Generation
// ============================================

import { supabase, isAuthenticated, getCurrentUser } from "./supabaseClient";
import { generateAiResponse } from "./geminiService";
import { buildSynthesisContext } from "./ragService";
import { findRelevantFormulary } from "./formularyService";
import { sanitizeCurrencyAndMath } from "./examParser";
import { StorageItem } from "./storageService";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Question {
  id: string; // crypto.randomUUID()
  question: string;
  options: string[]; // exactly 4 choices [A, B, C, D]
  correctIndex: number; // 0, 1, 2, 3
  explanation: string;
  topicTag: string;
}

export interface ExamSectionConfig {
  name: string;
  questionCount: number;
  mode: "grounded" | "skill-style"; // defaults to "grounded"
  topicFocus?: string;
}

export interface ExamConfig {
  difficulty: "easy" | "mixed" | "hard";
  timedMode: boolean;
  timerMinutes?: number;
  benchmarkScore: number; // e.g. 80
  sections: ExamSectionConfig[];
}

export interface ExamRecord {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  source_item_ids: string[];
  config: ExamConfig;
  questions: Question[];
  version: number;
  visibility: "private" | "unlisted" | "public";
  created_at: string;
  updated_at: string;
}

export interface ExamAttemptRecord {
  id: string;
  exam_id: string;
  user_id?: string;
  score: number;
  total: number;
  percentage: number;
  answers: Record<string, number>; // keyed by question ID string
  questions_snapshot: Question[]; // immutable snapshot at submit time
  duration_seconds?: number;
  passed: boolean;
  created_at: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  mastered?: boolean;
}

export interface FlashcardDeckRecord {
  id: string;
  user_id?: string;
  title: string;
  source_item_ids: string[];
  cards: Flashcard[];
  version: number;
  visibility: "private" | "unlisted" | "public";
  created_at: string;
  updated_at: string;
}

// ============================================
// UTILITIES
// ============================================

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const LOCAL_STORAGE_EXAMS_KEY = "rm_local_exams";
const LOCAL_STORAGE_ATTEMPTS_KEY = "rm_local_attempts";
const LOCAL_STORAGE_DECKS_KEY = "rm_local_decks";

// In-memory fallback if localStorage is unavailable
const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof localStorage !== "undefined") {
    try {
      return localStorage.getItem(key);
    } catch {}
  }
  return memoryStore.get(key) || null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {}
  }
  memoryStore.set(key, value);
}

// ============================================
// LOCAL STORAGE HELPERS (Offline / Cache)
// ============================================

export function getLocalExams(): ExamRecord[] {
  try {
    const raw = getStorageItem(LOCAL_STORAGE_EXAMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalExams(exams: ExamRecord[]): void {
  try {
    setStorageItem(LOCAL_STORAGE_EXAMS_KEY, JSON.stringify(exams));
  } catch (err) {
    console.warn("Failed to save local exams:", err);
  }
}

export function getLocalAttempts(): ExamAttemptRecord[] {
  try {
    const raw = getStorageItem(LOCAL_STORAGE_ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalAttempts(attempts: ExamAttemptRecord[]): void {
  try {
    setStorageItem(LOCAL_STORAGE_ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch (err) {
    console.warn("Failed to save local attempts:", err);
  }
}

export function getLocalFlashcardDecks(): FlashcardDeckRecord[] {
  try {
    const raw = getStorageItem(LOCAL_STORAGE_DECKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalFlashcardDecks(decks: FlashcardDeckRecord[]): void {
  try {
    setStorageItem(LOCAL_STORAGE_DECKS_KEY, JSON.stringify(decks));
  } catch (err) {
    console.warn("Failed to save local flashcard decks:", err);
  }
}

// ============================================
// EXAM OPERATIONS (Dual Local-First + Supabase)
// ============================================

export async function saveExam(
  examData: Partial<ExamRecord> & { title: string; questions: Question[] }
): Promise<ExamRecord> {
  const isAuth = await isAuthenticated();
  const user = await getCurrentUser();
  const now = new Date().toISOString();

  const record: ExamRecord = {
    id: examData.id || generateUUID(),
    user_id: user?.id,
    title: examData.title.trim() || "Untitled Exam",
    description: examData.description || "",
    source_item_ids: examData.source_item_ids || [],
    config: examData.config || {
      difficulty: "mixed",
      timedMode: false,
      benchmarkScore: 80,
      sections: [{ name: "General Assessment", questionCount: examData.questions.length, mode: "grounded" }],
    },
    questions: examData.questions,
    version: (examData.version || 0) + 1,
    visibility: examData.visibility || "private",
    created_at: examData.created_at || now,
    updated_at: now,
  };

  // 1. If authenticated, Supabase is source of truth
  if (isAuth && user) {
    try {
      const { data, error } = await supabase
        .from("exams")
        .upsert({
          id: record.id,
          user_id: user.id,
          title: record.title,
          description: record.description,
          source_item_ids: record.source_item_ids,
          config: record.config,
          questions: record.questions,
          version: record.version,
          visibility: record.visibility,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        // Update local cache
        const local = getLocalExams().filter((e) => e.id !== record.id);
        saveLocalExams([data, ...local]);
        return data;
      }
    } catch (err) {
      console.warn("Supabase exam upsert failed, caching locally:", err);
    }
  }

  // 2. Unauthenticated / Offline fallback: LocalStorage is source of truth
  const local = getLocalExams().filter((e) => e.id !== record.id);
  const updatedLocal = [record, ...local];
  saveLocalExams(updatedLocal);
  return record;
}

export async function getAllExams(): Promise<ExamRecord[]> {
  const isAuth = await isAuthenticated();
  const user = await getCurrentUser();

  if (isAuth && user) {
    try {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (!error && data) {
        saveLocalExams(data); // update read cache
        return data;
      }
    } catch (err) {
      console.warn("Failed to fetch exams from Supabase, using local cache:", err);
    }
  }

  return getLocalExams();
}

export async function deleteExam(examId: string): Promise<boolean> {
  const isAuth = await isAuthenticated();
  const user = await getCurrentUser();

  // Remove from local cache
  const local = getLocalExams().filter((e) => e.id !== examId);
  saveLocalExams(local);

  if (isAuth && user) {
    try {
      const { error } = await supabase
        .from("exams")
        .delete()
        .eq("id", examId)
        .eq("user_id", user.id);
      return !error;
    } catch {
      return false;
    }
  }

  return true;
}

// ============================================
// EXAM ATTEMPTS (Immutability Snapshots)
// ============================================

export async function saveExamAttempt(
  attemptInput: Omit<ExamAttemptRecord, "id" | "created_at">
): Promise<ExamAttemptRecord> {
  const isAuth = await isAuthenticated();
  const user = await getCurrentUser();
  const now = new Date().toISOString();

  const attempt: ExamAttemptRecord = {
    ...attemptInput,
    id: generateUUID(),
    user_id: user?.id,
    created_at: now,
  };

  if (isAuth && user) {
    try {
      const { data, error } = await supabase
        .from("exam_attempts")
        .insert({
          id: attempt.id,
          exam_id: attempt.exam_id,
          user_id: user.id,
          score: attempt.score,
          total: attempt.total,
          percentage: attempt.percentage,
          answers: attempt.answers,
          questions_snapshot: attempt.questions_snapshot,
          duration_seconds: attempt.duration_seconds,
          passed: attempt.passed,
        })
        .select()
        .single();

      if (!error && data) {
        const local = getLocalAttempts().filter((a) => a.id !== attempt.id);
        saveLocalAttempts([data, ...local]);
        return data;
      }
    } catch (err) {
      console.warn("Supabase attempt insert failed, caching locally:", err);
    }
  }

  const local = getLocalAttempts().filter((a) => a.id !== attempt.id);
  const updated = [attempt, ...local];
  saveLocalAttempts(updated);
  return attempt;
}

export async function getExamAttempts(examId?: string): Promise<ExamAttemptRecord[]> {
  const isAuth = await isAuthenticated();
  const user = await getCurrentUser();

  if (isAuth && user) {
    try {
      let query = supabase
        .from("exam_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (examId) {
        query = query.eq("exam_id", examId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn("Failed to fetch attempts from Supabase, using local cache:", err);
    }
  }

  const local = getLocalAttempts();
  return examId ? local.filter((a) => a.exam_id === examId) : local;
}

// ============================================
// FLASHCARD DECKS OPERATIONS
// ============================================

export async function saveFlashcardDeck(
  deckData: Partial<FlashcardDeckRecord> & { title: string; cards: Flashcard[] }
): Promise<FlashcardDeckRecord> {
  const isAuth = await isAuthenticated();
  const user = await getCurrentUser();
  const now = new Date().toISOString();

  const record: FlashcardDeckRecord = {
    id: deckData.id || generateUUID(),
    user_id: user?.id,
    title: deckData.title.trim() || "Custom Study Deck",
    source_item_ids: deckData.source_item_ids || [],
    cards: deckData.cards,
    version: (deckData.version || 0) + 1,
    visibility: deckData.visibility || "private",
    created_at: deckData.created_at || now,
    updated_at: now,
  };

  if (isAuth && user) {
    try {
      const { data, error } = await supabase
        .from("flashcard_decks")
        .upsert({
          id: record.id,
          user_id: user.id,
          title: record.title,
          source_item_ids: record.source_item_ids,
          cards: record.cards,
          version: record.version,
          visibility: record.visibility,
          updated_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        const local = getLocalFlashcardDecks().filter((d) => d.id !== record.id);
        saveLocalFlashcardDecks([data, ...local]);
        return data;
      }
    } catch (err) {
      console.warn("Supabase flashcards upsert failed, caching locally:", err);
    }
  }

  const local = getLocalFlashcardDecks().filter((d) => d.id !== record.id);
  const updated = [record, ...local];
  saveLocalFlashcardDecks(updated);
  return record;
}

export async function getAllFlashcardDecks(): Promise<FlashcardDeckRecord[]> {
  const isAuth = await isAuthenticated();
  const user = await getCurrentUser();

  if (isAuth && user) {
    try {
      const { data, error } = await supabase
        .from("flashcard_decks")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (!error && data) {
        saveLocalFlashcardDecks(data);
        return data;
      }
    } catch (err) {
      console.warn("Failed to fetch decks from Supabase, using local cache:", err);
    }
  }

  return getLocalFlashcardDecks();
}

// ============================================
// INITIAL LOGIN MIGRATION (Local -> Supabase)
// ============================================

export async function migrateLocalExamsToSupabase(): Promise<{
  migratedExams: number;
  migratedAttempts: number;
}> {
  const isAuth = await isAuthenticated();
  const user = await getCurrentUser();
  if (!isAuth || !user) return { migratedExams: 0, migratedAttempts: 0 };

  let migratedExams = 0;
  let migratedAttempts = 0;

  const localExams = getLocalExams();
  for (const exam of localExams) {
    if (!exam.user_id) {
      try {
        await supabase.from("exams").upsert({
          ...exam,
          user_id: user.id,
        });
        exam.user_id = user.id;
        migratedExams++;
      } catch {}
    }
  }
  saveLocalExams(localExams);

  const localAttempts = getLocalAttempts();
  for (const att of localAttempts) {
    if (!att.user_id) {
      try {
        await supabase.from("exam_attempts").upsert({
          ...att,
          user_id: user.id,
        });
        att.user_id = user.id;
        migratedAttempts++;
      } catch {}
    }
  }
  saveLocalAttempts(localAttempts);

  return { migratedExams, migratedAttempts };
}

// ============================================
// MULTI-BATCH GROUNDED AI GENERATION PIPELINE
// Progressive "Start While Generating", Deduplication & Retries
// ============================================

export interface BatchProgress {
  completedQuestions: number;
  totalQuestions: number;
  currentSection: string;
  currentBatch: number;
  totalBatches: number;
  isFirstBatchReady: boolean;
  questionsSoFar: Question[];
}

export interface BatchSlice {
  sectionName: string;
  topicFocus?: string;
  mode: "grounded" | "skill-style";
  count: number;
}

export function partitionExamSections(sections: ExamSectionConfig[], maxBatchSize = 20): BatchSlice[] {
  const slices: BatchSlice[] = [];
  for (const sec of sections) {
    let remaining = Math.max(sec.questionCount, 1);
    while (remaining > 0) {
      const take = Math.min(remaining, maxBatchSize);
      slices.push({
        sectionName: sec.name,
        topicFocus: sec.topicFocus || sec.name,
        mode: sec.mode || "grounded",
        count: take,
      });
      remaining -= take;
    }
  }
  return slices;
}

export async function generateExamInBatches(
  sourceItems: StorageItem[],
  sections: ExamSectionConfig[],
  difficulty: "easy" | "mixed" | "hard" = "mixed",
  onProgress?: (progress: BatchProgress) => void,
  signal?: AbortSignal
): Promise<Question[]> {
  const slices = partitionExamSections(sections, 20);
  const totalQuestions = slices.reduce((acc, s) => acc + s.count, 0);

  const accumulatedQuestions: Question[] = [];
  const generatedStems: string[] = [];

  for (let bIdx = 0; bIdx < slices.length; bIdx++) {
    if (signal?.aborted) throw new Error("Generation aborted by user");

    const slice = slices[bIdx];
    const isFirstBatch = bIdx === 0;

    let batchQuestions: Question[] = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && batchQuestions.length === 0) {
      if (signal?.aborted) throw new Error("Generation aborted by user");
      attempts++;

      try {
        // 1. Context Synthesis
        let contextCorpus = "";
        if (slice.mode === "grounded" && sourceItems.length > 0) {
          const targetChunks = slice.count <= 10 ? 8 : 14;
          contextCorpus = await buildSynthesisContext(
            sourceItems,
            slice.topicFocus || slice.sectionName,
            targetChunks
          );
        }

        // 2. Formulary injection
        const relevantFormularies = findRelevantFormulary(`${slice.sectionName} ${slice.topicFocus || ""} ${contextCorpus.slice(0, 2000)}`);
        const formularyBlock = relevantFormularies.length > 0
          ? `\nAuthoritative Formulas/Rules:\n${relevantFormularies.map((r) => `• ${r}`).join("\n")}\n`
          : "";

        // 3. Deduplication instruction: exclude previously generated stems
        const dedupePrompt = generatedStems.length > 0
          ? `\nDO NOT repeat or duplicate any of the following previously generated questions:\n${generatedStems.slice(-25).map((s) => `• "${s.slice(0, 60)}..."`).join("\n")}\n`
          : "";

        const diffPrompt = difficulty === "easy"
          ? "Target foundational recall, clear definitions, and direct single-step calculations."
          : difficulty === "hard"
          ? "Target advanced analytical synthesis, edge cases, multi-step derivations, and challenging distractor options."
          : "Maintain a balanced mix of 40% conceptual fundamentals, 40% intermediate application, and 20% challenging derivations.";

        const prompt = `You are a university examination board professor designing an academic examination.
Exam Section: "${slice.sectionName}"
Topic Focus: "${slice.topicFocus || slice.sectionName}"
Difficulty Level: ${difficulty.toUpperCase()} (${diffPrompt})
${formularyBlock}
${dedupePrompt}
Course Material Excerpts:
${contextCorpus || "Generate comprehensive questions covering essential fundamentals of " + slice.sectionName}

REQUIREMENTS:
1. Generate EXACTLY ${slice.count} high-yield, exam-quality questions.
2. Every mathematical formula, equation, or variable MUST be enclosed in standard LaTeX dollar signs (e.g. $x^2 + y^2 = r^2$, $\\int_0^1 x dx$, $\\neg P \\lor Q$, $9.81\\text{ m/s}^2$).
3. For every question, provide 4 distinct multiple-choice options (labeled A, B, C, D). Ensure distractor choices reflect common student traps.
4. In "explanation", provide a step-by-step academic derivation or rationale.
5. Provide a concise topicTag (e.g. "${slice.sectionName}").

Respond with ONLY a raw JSON array of objects:
[
  {
    "question": "Question statement with LaTeX ($...$)?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Step-by-step derivation or rationale.",
    "topicTag": "${slice.sectionName}"
  }
]`;

        const response = await generateAiResponse(prompt);
        const cleanJson = response.replace(/```json/gi, "").replace(/```/gi, "").trim();
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed) && parsed.length > 0) {
          batchQuestions = parsed.map((q: any) => ({
            id: generateUUID(),
            question: sanitizeCurrencyAndMath(q.question || ""),
            options: Array.isArray(q.options) && q.options.length >= 4
              ? q.options.slice(0, 4).map((o: any) => sanitizeCurrencyAndMath(String(o)))
              : ["A", "B", "C", "D"],
            correctIndex: typeof q.correctIndex === "number" ? Math.min(Math.max(q.correctIndex, 0), 3) : 0,
            explanation: sanitizeCurrencyAndMath(q.explanation || "Identified based on study materials."),
            topicTag: q.topicTag || slice.sectionName,
          }));
        }
      } catch (batchErr) {
        console.warn(`Batch ${bIdx + 1}/${slices.length} attempt ${attempts} failed:`, batchErr);
        if (attempts >= maxAttempts) {
          // If all retries fail, create fallback questions for this slice so the exam doesn't abort
          batchQuestions = Array.from({ length: slice.count }).map((_, fIdx) => ({
            id: generateUUID(),
            question: `Review question on ${slice.sectionName} (#${accumulatedQuestions.length + fIdx + 1})`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 0,
            explanation: `Review question generated for ${slice.sectionName}.`,
            topicTag: slice.sectionName,
          }));
        } else {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }

    accumulatedQuestions.push(...batchQuestions);
    batchQuestions.forEach((q) => generatedStems.push(q.question));

    if (onProgress) {
      onProgress({
        completedQuestions: accumulatedQuestions.length,
        totalQuestions,
        currentSection: slice.sectionName,
        currentBatch: bIdx + 1,
        totalBatches: slices.length,
        isFirstBatchReady: isFirstBatch && accumulatedQuestions.length >= slice.count,
        questionsSoFar: [...accumulatedQuestions],
      });
    }
  }

  return accumulatedQuestions;
}
