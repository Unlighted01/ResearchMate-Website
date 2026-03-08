# 📦 AI Handover: ResearchMate Web Platform

## 🚀 Architectural Context
The ResearchMate Web Platform serves as the centralized hub for research management. Built with **React** and **Vite**, it features a premium "Apple-style" Dark Mode Dashboard and integrates deeply with **Supabase** and **Vercel Serverless Functions**.

### 🧠 Strategic "Magic" Logic (Read Carefully)
1.  **3-Tier OCR Fallback Chain:**
    - Located in `api/ocr.ts` (Vercel API).
    - Pipeline: **OpenRouter (gpt-4o) -> Gemini 1.5 Pro -> Claude 3.5 Sonnet**.
    - If one fails or hits rate limits, it automatically falls back to the next.
2.  **Interactive Color Metadata:**
    - Like the extension, the website uses the `tags` array to store `color:x` metadata.
    - **Dashboard Interaction:** Users can change an item's color in the `Dashboard.tsx` detail modal. This triggers an `updateItem` call which correctly replaces the existing `color:` tag in the array.
    - **Rendering:** `List/Grid` views dynamically extract this color to render sidebar accents and badges without requiring a separate database column.
3.  **Decoupled Summarization:**
    - Summaries are not generated automatically on upload (to save tokens/performance).
    - Users must trigger them manually via the "Generate Summary" button in the item modal.
4.  **Hardware Ingestion (Smart Pen):**
    - The `/supabase/functions/smart-pen/` Edge Function directs byte streams from the ESP32 directly to the OCR API.
    - Metadata is added later via the `SmartPenScanModal.tsx` on the website.

### 🛠️ Core Workflows
- **Research Dashboard:** `Dashboard.tsx` implements a dual-view (List/Grid) interface with bulk selection, filtering (by tag, source, or color), and detailed modals.
- **Bulk Operations:** `BulkActions.tsx` handles batch deletions, collection moves, and the new **Bulk Markdown Export**.
- **Collection Management:** Aggregated counts are handled client-side in `collectionsService.ts` to ensure UI reactivity.

### 💅 Design Language
- **Styling:** TailwindCSS with a custom palette (`#007AFF` blue, high-contrast dark backgrounds).
- **Animations:** Powered by `framer-motion` (aliased as `motion/react`).
- **Layout:** Strict Apple Design guidelines—liberal whitespace, rounded `2xl` corners, and subtle borders.

### ⏭️ Roadmap for the Next AI
1.  **Global Search (Command+K):** A high-priority request to search across all collections and OCR texts instantly.
2.  **Shared Collections:** Implementing Supabase RLS policies to allow researchers to collaborate on a single folder.
3.  **AI Assistant Chat:** An interface (`AIAssistant.tsx` draft already exists) to "chat" with your research collection via RAG.

### ⚠️ Dev Notes
- **Lints:** CSS inline styles are used for collection color visualization and dynamic highlight rendering.
- **Real-time:** Supabase `subscribeToItems` is enabled in the Dashboard to instantly reflect extension captures.
