# ResearchMate Website

The full-stack web platform for ResearchMate - part of the ResearchMate ecosystem that includes a browser extension, mobile app, and smart pen.

## 🚀 Features

- **Board-Grade Mock Exam Engine** - Seeded PRNG (`mulberry32`), balanced answer keys, and timed practice testing with physical OMR answer sheet planning (A–D, T/F 2-bubble, matching 8-bubble).
- **Deterministic PDF Ingestion** - 2-pass layout-aware extractor converting statutory codes, syllabi, and textbooks into grounded MCQs, negative-choice items, deadline blanks, and flashcard decks.
- **Local-First Question Bank** - $0 runtime API cost, high-capacity browser IndexedDB storage, batch rollback, and psychometric enemy-item cluing elimination.
- **Document Studio** - Split-screen PDF reader with in-text citation pins, note highlights, and LaTeX formula manuscript editing (TipTap).
- **AI Research Assistant & RAG** - Multi-paper literature review synthesis matrix, hybrid vector search, and document-scoped chat.
- **Multimodal & Smart Pen OCR** - Ingest handwritten notebook and whiteboard derivations directly into LaTeX math and editable review items.
- **Real-Time Sync & Monetization** - Supabase real-time sync with browser extension, mobile app, and PayMongo tier checkout.

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (shared with extension)
- Google AI API key (for Gemini)

## ⚙️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

> ⚠️ **Important**: Use the SAME Supabase credentials as your extension to share data!

### 3. Configure Supabase OAuth (for website login)

In your Supabase dashboard:

1. Go to **Authentication > URL Configuration**
2. Add these redirect URLs:
   - `YOUR_SITE_URL/#/auth/callback` (development)
   - `https://your-domain.com/#/auth/callback` (production)

### 4. Run Development Server

```bash
npm run dev
```

Open [YOUR_SITE_URL](YOUR_SITE_URL) in your browser.

## 🏗️ Project Architecture & Engines

For an exhaustive architectural walkthrough of all 28 services, psychometric engines, file hierarchies, and the multimodal ingestion pipeline, see [docs/CODEBASE_OVERVIEW.md](file:///c:/Users/netne/ReserachMate/Researchmate%20Website/docs/CODEBASE_OVERVIEW.md).

```
ResearchMate Platform
├── Exam & Assessment Engine
│   ├── Deterministic PDF Ingestion (pdfQuestionImporter.ts)
│   ├── Psychometric Quality & Linting (distractorQualityService.ts)
│   ├── Seeded PRNG Shuffling & Answer Keys (examSeedService.ts)
│   ├── Local-First Question Bank & IndexedDB (questionBankService.ts)
│   └── Answer Sheet Layout Planner (choicesPerItem: 2, 4, 5, 8 bubbles)
├── Research & Document Studio
│   ├── PDF Studio with In-Text Citations (DocumentStudio.tsx)
│   ├── TipTap LaTeX Manuscript Editor (StudioNoteEditor.tsx)
│   ├── Literature Review Comparative Matrix (api/literature-matrix.ts)
│   └── 3D Citation Force Graph (CollectionsPage)
└── Multimodal & Offline Sync
    ├── Gemini Vision OCR for Handwritten STEM & Notes (api/ocr.ts)
    ├── Smart Pen / Mobile Photo Gallery Ingestion
    └── Supabase Real-Time Database & Auth
```

## 🔧 Available Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `npm run dev`        | Start development server     |
| `npm run build`      | Build for production         |
| `npm run preview`    | Preview production build     |
| `npm run type-check` | Run TypeScript type checking |

## 🔗 Ecosystem Integration

This website is designed to work seamlessly with:

| Component             | Function                        | Data Flow              |
| --------------------- | ------------------------------- | ---------------------- |
| **Browser Extension** | Highlight & save text           | → Supabase → Website   |
| **Mobile App**        | Camera scanning, offline access | → Supabase → Website   |
| **Smart Pen**         | Handwritten notes with OCR      | → Supabase Edge Function → Website |
| **Website**           | View, manage, analyze           | ← Supabase (real-time)             |

> **Note on Pairing**: Device pairing is handled via the `/smart-pen` Edge Function to bypass RLS restrictions and ensure unique hardware identity.

All components share the same Supabase database, enabling:

- Real-time sync across all devices
- Consistent authentication (same account everywhere)
- Unified research collection

## 📊 Database Schema

The website uses these Supabase tables (shared with extension):

### `items` table

| Column        | Type      | Description                               |
| ------------- | --------- | ----------------------------------------- |
| id            | uuid      | Primary key                               |
| user_id       | uuid      | Foreign key to auth.users                 |
| text          | text      | Research content                          |
| source_url    | text      | Original source URL                       |
| source_title  | text      | Page/source title                         |
| tags          | text[]    | Array of tags                             |
| note          | text      | User notes                                |
| ai_summary    | text      | AI-generated summary                      |
| ocr_confidence| integer   | Heuristic OCR quality score (0–100)       |
| device_source | text      | 'extension', 'mobile', 'smart_pen', 'web' |
| collection_id | uuid      | Optional collection reference             |
| created_at    | timestamp | Creation timestamp                        |
| updated_at    | timestamp | Last update timestamp                     |

### `collections` table

| Column      | Type      | Description               |
| ----------- | --------- | ------------------------- |
| id          | uuid      | Primary key               |
| user_id     | uuid      | Foreign key to auth.users |
| name        | text      | Collection name           |
| description | text      | Optional description      |
| color       | text      | Hex color code            |
| created_at  | timestamp | Creation timestamp        |

## 🔐 Security Notes

1. **Never commit `.env.local`** - Contains sensitive API keys
2. **Use environment variables** - All secrets should be in `.env.local`
3. **Row Level Security** - Supabase RLS ensures users only see their data
4. **OAuth tokens** - Handled securely by Supabase Auth

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Manual Build

```bash
npm run build
```

Output will be in the `dist` folder, ready for any static hosting.

## 🐛 Troubleshooting

### OAuth not working?

- Check redirect URLs in Supabase dashboard
- Ensure URL matches exactly (including `/#/auth/callback`)

### Data not syncing?

- Verify Supabase credentials match extension
- Check browser console for errors
- Ensure Realtime is enabled in Supabase

### AI summaries failing?

- Verify Gemini API key is correct
- Check API quota in Google AI Studio
- Look for errors in browser console

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper PART sections
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Part of the ResearchMate Ecosystem** 🔬✨
