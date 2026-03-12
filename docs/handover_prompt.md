# 📦 AI Handover: ResearchMate Web Platform

## 🚀 Architectural Context
The ResearchMate Web Platform serves as the centralized hub for research management. Built with **React** and **Vite**, it features a premium multi-theme Dashboard and integrates deeply with **Supabase** and **Vercel Serverless Functions**.

### 🧠 Strategic "Magic" Logic (Read Carefully)
1. **3-Tier OCR Fallback Chain:**
   - Located in `api/ocr.ts` (Vercel API).
   - Pipeline: **OpenRouter (gpt-4o) → Gemini 1.5 Pro → Claude 3.5 Sonnet**.
   - If one fails or hits rate limits, it automatically falls back to the next.
2. **Interactive Color Metadata:**
   - The website uses the `tags` array to store `color:x` metadata.
   - **Dashboard Interaction:** Users can change an item's color in the `Dashboard.tsx` detail modal. This triggers an `updateItem` call which correctly replaces the existing `color:` tag in the array.
   - **Rendering:** List/Grid views dynamically extract this color to render sidebar accents and badges without a separate database column.
3. **Decoupled Summarization:**
   - Summaries are not generated automatically on upload (to save tokens/performance).
   - Users must trigger them manually via the "Generate Summary" button in the item modal.
4. **Hardware Ingestion (Smart Pen):**
   - The `/supabase/functions/smart-pen/` Edge Function directs byte streams from the ESP32 directly to the OCR API.
   - Added `list`, `unpair`, and `confirm` actions to manage devices without hitting RLS restrictions.

---

## 🎨 Visual Theme System

The app has **three swappable UI themes** selected via **Settings → Appearance**.
Active theme is stored in `localStorage` as `visualTheme` and applied as `data-ui-theme` on `<html>`.
All theme CSS lives in `index.css` under clearly labelled blocks.
The theme context is `src/context/ThemeContext.tsx` — exposes `visualTheme` + `setVisualTheme`.

| Theme | `data-ui-theme` | Aesthetic |
|---|---|---|
| **Minimalist** | `minimalist` | Clean black/white, no blur, sharp edges |
| **Bubble** | `bubble` | Blue/violet gradients, pill buttons, Three.js glass cursor orb |
| **Glass** | `glass` | Editorial dark glassmorphism — two distinct light/dark variants |

### Glass Theme (Henning Tillmann inspired — March 2026)
Both modes use `backdrop-filter: blur(var(--ui-glass-blur)) saturate(1.6)` on all surfaces via `.theme-surface`.

**Light mode** (`html[data-ui-theme="glass"]`):
- Background: `#F0F4F8` + soft desaturated cyan/violet orbs
- Surfaces: `rgba(255,255,255,0.72)` — more opaque, depth via soft shadows (no border)
- Accents: muted cyan `#0891b2`

**Dark mode** (`html.dark[data-ui-theme="glass"]`):
- Background: `#0a0a0f` + vivid cyan/violet glow orbs
- Surfaces: `rgba(255,255,255,0.04)` — near-invisible, defined by hairline ring border `rgba(255,255,255,0.09)`
- Hover: cyan glow ring `0 0 0 1px rgba(34,211,238,0.35)` replaces box-shadow
- Headlines: faint text-shadow glow `rgba(34,211,238,0.18)`

### Bubble Theme — Three.js Glass Cursor (March 2026)
**`src/components/shared/GlassBubble.tsx`** — full Three.js implementation, no additional libraries.

- Full-screen fixed WebGL canvas (`pointer-events: none`, `z-index: 9999`)
- `THREE.MeshPhysicalMaterial` with `transmission: 1.0`, `ior: 1.45`, `clearcoat: 1.0`
- **Simplex 3D noise** injected into vertex shader via `onBeforeCompile` → organic liquid wobble
- `RoomEnvironment` as environment map → realistic glass surface reflections
- Two orbiting point lights (cyan `#60a5fa` + violet `#a78bfa`) create dynamic shifting reflections
- Mouse tracking: lerp interpolation (`LERP = 0.09`) via `requestAnimationFrame`
- System cursor hidden (`cursor: none !important`) and replaced by glass sphere + 6px precision dot (`.cursor-dot`)
- `ThemedCursorBubble` in `App.tsx` renders this only when `visualTheme === 'bubble'`
- **Dependency:** `three` + `@types/three`

### FloatingOrbs Background (`src/components/marketing/FloatingOrbs.tsx`)
Ambient orbs used in both glass and bubble theme backgrounds:
- **Palette (updated March 2026):** Cyan `rgba(34,211,238)`, Violet `rgba(167,139,250)`, Indigo `rgba(99,102,241)`
- Orbs 420–700px radius, opacity 0.55–0.75, slow drift (30–50s rAF animation)
- Mouse parallax (throttled 60ms)

---

## 🛠️ Core Workflows
- **Research Dashboard:** `Dashboard.tsx` implements a dual-view (List/Grid) interface with bulk selection, filtering (by tag, source, or color), and detailed modals.
- **Bulk Operations:** `BulkActions.tsx` handles batch deletions, collection moves, and Bulk Markdown Export.
- **Collection Management:** Aggregated counts handled client-side in `collectionsService.ts` for UI reactivity.

---

## 🔐 OAuth Popup Flow (Fixed March 2026)

Google OAuth opens a popup via `window.open()`. Google strips the `#/auth/callback` hash fragment from redirect URIs, so the popup lands on `/` instead of `/#/auth/callback`. 

Fix: **`OAuthPopupHandler`** component in `App.tsx` (rendered outside the router, inside `ThemeProvider`):
- Detects `?code=` in `window.location.search` + `window.opener` on any page load
- Replaces the popup DOM with a "Completing sign in..." spinner
- Listens for `supabase.auth.onAuthStateChange(SIGNED_IN)` → posts `AUTH_SUCCESS` to parent → `window.close()`
- Handles the race condition where session is already established via `getSession()` fallback

---

## 💅 Design Language
- **Styling:** Vanilla CSS with CSS custom properties (`--ui-*` tokens per theme)
- **Animations:** `framer-motion` (aliased as `motion/react`) + CSS keyframes
- **Not Tailwind** — all theming via CSS variables + utility classes in `index.css`

---

## ⚠️ Dev Notes
- **CSS inline styles:** Used in `FloatingOrbs.tsx` and `GlassBubble.tsx` for dynamic animation values (rAF computed positions cannot be static CSS)
- **Three.js:** Only loaded/rendered when bubble theme is active (`ThemedCursorBubble` returns null otherwise)
- **Backdrop-filter order:** `-webkit-backdrop-filter` before `backdrop-filter` in all new CSS
- **Real-time:** Supabase `subscribeToItems` is enabled in Dashboard for instant extension capture reflection

---

## ⏭️ Roadmap for the Next AI
1. **Global Search (Command+K):** High-priority — search across all collections and OCR texts.
2. **Shared Collections:** Supabase RLS policies for collaborative research folders.
3. **AI Assistant Chat:** `AIAssistant.tsx` draft exists — implement RAG over research collection.
4. **Condensed display font for Glass theme:** Add Barlow Condensed (Google Fonts) for headings under `html[data-ui-theme="glass"] .theme-title`.

---

*Last Updated: March 2026 — Visual theme system documented; glass theme redesign, Three.js bubble cursor, FloatingOrbs recolor, OAuthPopupHandler fix*
