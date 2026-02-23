# 📦 Project Handover: ResearchMate Web Platform

## 🚀 Current Status: STABLE & DEPLOYED

The web application is fully functional, styled with premium Dark Mode UI, and securely connected to Supabase for real-time data persistence. The OCR Pipeline has been completely refactored.

### ✅ Key Features Working:

1.  **3-Tier OCR Integration:**
    - The extraction system (`/api/ocr`) utilizes a robust fallback chain: **OpenRouter (Primary)** -> **Gemini EXP (Secondary)** -> **Claude 3.5 Sonnet (Tertiary)**.
    - OCR extraction dynamically limits tokens (`max_tokens: 8192`) and aggressively formats output into strictly structured Markdown (Headers, Checkboxes, Tables), ignoring noise like page numbers and artifacts.
2.  **Decoupled Smart Gallery:**
    - Images uploaded from the desktop, phone, or Smart Pen no longer freeze the UI to process text automatically. They are cached in the gallery, waiting for the user to explicitly hit "Extract Text".
3.  **Dashboard Architecture:**
    - Persistent List/Grid view toggles (via `localStorage`).
    - Smart List View layout constraints (`min-w-0`) implemented to restrict long string overflow and stretching bugs.
    - Bulk Selection handles checkboxes dynamically across all items for Batch Collection moves and Deletions.
4.  **Collections Engine:**
    - Sub-folders explicitly count item aggregations to avoid stale 0-item caches on refresh.
    - Users can now click "Add Items" directly from inside a Collection folder, opening a searchable Modal of unassigned scans.
5.  **Smart Pen Firmware Routing:**
    - The Supabase Edge function (`/supabase/functions/smart-pen/index.ts`) has been optimized to passively pipe incoming ESP32 byte streams directly into the centralized Vercel OCR API.

### 🛠️ Technology Stack

- **Frontend:** React, Vite, TailwindCSS (Dark Mode Centric), Lucide Icons
- **Backend:** Serverless Vercel Functions (`@vercel/node`)
- **Database:** Supabase (PostgreSQL, Edge Functions, Storage Buckets, RLS Policies)
- **AI Integrations:** OpenRouter API, Google Gemini Vision API, Anthropic Claude API

### 📂 Code Structure

- `src/components/App/`: Main React components for Dashboard, Collections, and Smart Pen UI.
- `src/services/`: Client-side Database logic (`storageService.ts`, `collectionsService.ts`).
- `api/`: Vercel Serverless endpoints (`ocr.ts`).
- `supabase/functions/`: Deno Edge routing logic for the ESP32 hardware interactions.

### ⏭️ Next Steps / Maintenance:

1.  **Monitor Vercel Logs:** Keep an eye on the `api/ocr` endpoint on the Vercel dashboard to ensure the OpenRouter API limits aren't being aggressively tripped during heavy bulk extractions.
2.  **Responsive UI Polish:** Double-check padding and scrolling breakpoints on extreme mobile dimensions (`<350px`) for the "Select Collection" modal.
