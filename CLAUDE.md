# CLAUDE.md - ResearchMate Project Guidelines

> This file teaches Claude how to work on this codebase. Read this first!

---

## 🎯 Project Overview

**ResearchMate** - A multi-platform research management ecosystem
- Web Dashboard (React/TypeScript/Vite) — hosted on Vercel
- Chrome Extension — calls the same Vercel API endpoints
- Smart Pen (ESP32-S3 Hardware) — routes through Supabase Edge Function → Vercel API

**Tech Stack:** React, TypeScript, Vite, Supabase, Vanilla CSS, Vercel Serverless Functions

### AI Architecture

All AI features are centralized in `api/` (Vercel Serverless Functions). Enhancing any endpoint here automatically benefits all platforms.

| Endpoint | Purpose | Model | Fallback Chain |
|---|---|---|---|
| `api/summarize.ts` | Full-text summarization | `gemini-2.5-flash` | Gemini → OpenRouter (Grok) → Groq (Llama 3.3) |
| `api/summarize-item.ts` | Quick item/scan summaries | `gemini-2.5-flash` | OpenRouter → Gemini → Claude |
| `api/chat.ts` | Academic chat assistant | `gemini-2.5-flash` | Gemini → OpenRouter → Groq |
| `api/insights.ts` | Key insights extraction | `gemini-2.5-flash` | Gemini → OpenRouter → Groq |
| `api/generate-tags.ts` | Auto-tagging | `gemini-2.5-flash` | Gemini → OpenRouter → Groq |
| `api/ocr.ts` | Image text extraction | `gemini-2.5-flash` | OpenRouter → Gemini → Claude |
| `api/extract-citation.ts` | URL → citation metadata | `gemini-2.5-flash` | DOI/Crossref/Semantic Scholar + AI enhancement |
| `api/cite.ts` | ISBN/DOI/YouTube lookup | N/A (data lookup only) | OpenLibrary → Google Books / CrossRef / oEmbed |
| `supabase/functions/smart-pen/` | Hardware pairing & listing | N/A | Added `list`, `unpair`, and `confirm` actions |

---

## 💬 Communication Style

### Be Human, Not Robotic

```
❌ "I have successfully implemented the requested feature and it is now operational."
✅ "Done! Here's what I changed:"

❌ "I shall proceed to analyze the codebase for potential issues."
✅ "Let me check what's going on..."

❌ "Would you be amenable to me implementing this solution?"
✅ "Want me to fix that?"
```

### Formatting Rules

- Use **tables** for comparisons and before/after changes
- Use **code blocks** with proper language tags
- Use **headers** (##, ###) to organize responses
- Use **bullet points** for lists, not walls of text
- Use **emojis sparingly** but naturally: ✅ ❌ 😅 💀 🎯
- Keep responses **concise** - no essays
- Add **humor when appropriate** (especially when caught making mistakes)
- Use **checkmarks** for summaries: ✅ Done, ❌ Not yet

### When Showing File Changes

Always show file structure with tree format:
```
src/
├── components/
│   ├── shared/
│   │   └── Layouts.tsx    <-- Modified
│   └── marketing/
│       └── LandingPage.tsx
└── index.css
```

### Summary Format

End complex tasks with:
```
## Summary

| File | Change |
|------|--------|
| Component.tsx | Fixed X issue |
| styles.css | Added Y class |

✅ Feature now works
✅ Tested locally
❌ Still need to do Z
```

---

## 📁 Code Organization - PART Sectioning System

**CRITICAL:** Every file MUST use this section format!

```typescript
// ============================================
// FILENAME - Brief Description
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { something } from "somewhere";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface Props {
  // ...
}

type SomeType = {
  // ...
};

// ============================================
// PART 3: CONSTANTS & CONFIGURATION
// ============================================

const CONFIG = {
  // ...
};

// ============================================
// PART 4: HELPER FUNCTIONS
// ============================================

const helperFunction = () => {
  // ...
};

// ============================================
// PART 5: MAIN COMPONENT / LOGIC
// ============================================

const MainComponent: React.FC<Props> = () => {
  // ...
};

// ============================================
// PART 6: EXPORTS
// ============================================

export default MainComponent;
```

### Section Rules

- Use **exact comment format** with equal signs (44 = signs)
- Keep sections in **logical order**
- Add **sub-sections** if needed: `PART 5A: STATE`, `PART 5B: EFFECTS`
- **Empty sections** can be omitted but keep order consistent
- Add **brief comments** inside sections for complex logic

### Example Sub-Sections for Complex Components

```typescript
// ============================================
// PART 5: MAIN COMPONENT
// ============================================

// ---------- PART 5A: STATE ----------
const [data, setData] = useState(null);

// ---------- PART 5B: EFFECTS ----------
useEffect(() => {
  // ...
}, []);

// ---------- PART 5C: HANDLERS ----------
const handleClick = () => {
  // ...
};

// ---------- PART 5D: RENDER ----------
return (
  <div>...</div>
);
```

---

## 🎨 Design System - Apple-Inspired UI

### Color Palette

```typescript
// Primary Colors
--apple-blue: #007AFF
--apple-blue-dark: #0051D5

// Secondary Colors  
--apple-purple: #5856D6
--apple-pink: #AF52DE
--apple-green: #34C759
--apple-orange: #FF9500
--apple-red: #FF3B30

// Grays (Dark Mode)
--apple-gray-1: #8e8e93
--apple-gray-2: #636366
--apple-gray-3: #48484a
--apple-gray-4: #3a3a3c
--apple-gray-5: #2c2c2e
--apple-gray-6: #1c1c1e

// Backgrounds
Light: #F5F5F7, #FFFFFF
Dark: #000000, #1C1C1E, #2C2C2E
```

### UI Themes (Visual Theme System)

The app has three swappable visual themes, toggled via Settings → Appearance.
The active theme is stored in `localStorage` as `visualTheme` and applied as a `data-ui-theme` attribute on `<html>`.
All theme CSS lives in `index.css` under clearly labelled blocks.

| Theme | `data-ui-theme` | Aesthetic |
|---|---|---|
| **Minimalist** | `minimalist` | Editorial — blue `#2563eb` accent, hairline borders, true black/white, `letter-spacing: -0.025em` headings |
| **Bubble** | `bubble` | Playful premium — rose/lavender `#f472b6→#a78bfa`, warm cream `#fdf9ff` light, deep violet-black `#0d0814` dark |
| **Glass** | `glass` | Editorial dark glassmorphism (light: frosted white; dark: near-black with cyan/violet glow orbs) |

```css
/* Theme CSS variables — all in index.css */
html[data-ui-theme="glass"] { ... }          /* light mode vars */
html.dark[data-ui-theme="glass"] { ... }     /* dark mode overrides */
html[data-ui-theme="bubble"] { ... }
html[data-ui-theme="minimalist"] { ... }
```

#### Glass Theme (Henning Tillmann inspired)
- **Light mode:** `#F0F4F8` background, frosted white surfaces (`rgba(255,255,255,0.72)`), depth via soft shadows (no hard borders), muted cyan accents (`#0891b2`)
- **Dark mode:** `#0a0a0f` background, near-invisible surfaces (`rgba(255,255,255,0.04)`), hairline ring borders (`rgba(255,255,255,0.09)`), vivid cyan + violet glow orbs, cyan glow rings on hover
- `backdrop-filter: blur(18px) saturate(1.6)` on all glass surfaces

#### Bubble Theme — Three.js Glass Cursor (GlassBubble.tsx)
- A full-screen fixed WebGL canvas (`pointer-events: none`, `z-index: 9999`) renders a 3D glass sphere
- Uses `THREE.MeshPhysicalMaterial` with `transmission: 1.0`, `ior: 1.45`, `clearcoat: 1.0`
- Simplex 3D noise injected into the vertex shader via `onBeforeCompile` → organic liquid wobble
- Two orbiting colored point lights (cyan `#60a5fa` + violet `#a78bfa`) create dynamic reflections
- `RoomEnvironment` provides realistic glass surface reflections
- Mouse tracking uses lerp (`LERP = 0.09`) via `requestAnimationFrame`
- **System cursor is hidden** (`cursor: none !important`) — replaced by the glass sphere + a 6px precision dot
- `ThemedCursorBubble` component in `App.tsx` renders this only when `visualTheme === 'bubble'`
- **Dependency:** `three` + `@types/three`

### FloatingOrbs (Background Atmosphere)

`src/components/marketing/FloatingOrbs.tsx` renders ambient background orbs used throughout the app:
- **Palette:** Cyan `rgba(34,211,238)`, Violet `rgba(167,139,250)`, Indigo `rgba(99,102,241)`
- Orbs are 420–700px radius, opacity 0.55–0.75, slow drift animation (30–50s)
- Has mouse parallax (throttled 60ms)
- Used by both glass and bubble theme body backgrounds

### Glassmorphism Effects

```css
/* Standard glass effect */
.glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

/* Theme-aware surface: use .theme-surface class */
.theme-surface {
  background: var(--ui-surface-bg);
  border-color: var(--ui-surface-border);
  box-shadow: var(--ui-surface-shadow);
  border-radius: var(--ui-radius-lg);
  backdrop-filter: blur(var(--ui-glass-blur)) saturate(1.6);
}
```

### Shadows (Layered Apple-style)

```css
/* Use these instead of Tailwind defaults */
shadow-apple-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.08)
shadow-apple: 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.08)
shadow-apple-md: 0 4px 6px rgba(0,0,0,0.04), 0 10px 24px rgba(0,0,0,0.1)
shadow-apple-lg: 0 8px 16px rgba(0,0,0,0.06), 0 20px 40px rgba(0,0,0,0.12)
```

### Component Patterns

```tsx
// Buttons - Rounded full with shadow
<button className="px-6 py-3 bg-[#007AFF] hover:bg-[#0066DD] text-white font-medium rounded-full transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95">

// Cards - Rounded 2xl/3xl with glass
<div className="bg-white/50 backdrop-blur-md rounded-2xl p-6 border border-white/50 hover:bg-white/70 transition-all">

// Inputs - Rounded xl with subtle bg
<input className="w-full px-4 py-3 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl border-0 focus:ring-2 focus:ring-[#007AFF]/50">
```

---

## 📂 Project Structure

```
ResearchMate Website/
├── CLAUDE.md                    # You are here!
├── index.css                    # Global styles, design tokens, all 3 UI themes
├── api/                         # Vercel Serverless Functions (AI brain)
│   ├── _utils/auth.ts           # Auth + credit system
│   ├── summarize.ts             # Full-text summarization
│   ├── summarize-item.ts        # Quick item summaries
│   ├── chat.ts                  # Academic chat assistant
│   ├── insights.ts              # Key insights extraction
│   ├── generate-tags.ts         # Auto-tagging
│   ├── ocr.ts                   # Image text extraction (OCR)
│   ├── extract-citation.ts      # URL → citation metadata
│   ├── cite.ts                  # ISBN/DOI/YouTube lookup
│   └── set-custom-key.ts        # BYOK key management
│
├── src/
│   ├── index.tsx                # App entry
│   ├── App.tsx                  # Router + OAuthPopupHandler + ThemedCursorBubble
│   │
│   ├── context/
│   │   └── ThemeContext.tsx     # theme (light/dark/system) + visualTheme (minimalist/bubble/glass)
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── SignupPage.tsx
│   │   │
│   │   ├── marketing/
│   │   │   ├── MarketingHome.tsx
│   │   │   ├── FloatingOrbs.tsx  # Ambient background orbs (cyan/violet/indigo palette)
│   │   │   ├── LandingPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── TeamPage.tsx
│   │   │   └── SupportPage.tsx
│   │   │
│   │   ├── App/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── Statistics.tsx
│   │   │   ├── SmartPenGallery.tsx
│   │   │   ├── CitationGenerator.tsx
│   │   │   └── SettingsPage.tsx
│   │   │
│   │   └── shared/
│   │       ├── Layouts.tsx          # MarketingLayout, DashboardLayout
│   │       ├── UIComponents.tsx     # Button, Input, Card, etc.
│   │       ├── BubbleBackground.tsx
│   │       ├── GlassBubble.tsx      # Three.js glass cursor orb (bubble theme)
│   │       └── CursorBubble.tsx     # (legacy CSS cursor — superseded by GlassBubble)
│   │
│   └── services/
│       ├── supabaseClient.ts
│       ├── geminiService.ts
│       ├── storageService.ts
│       └── collectionsService.ts
│
├── supabase/
│   └── functions/
│       └── smart-pen/           # Edge Function for smart pen
│
└── public/
```

---

## ⚠️ Important Conventions

### Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DashboardLayout.tsx` |
| Hooks | camelCase with "use" | `useAuth.ts` |
| Services | camelCase + "Service" | `geminiService.ts` |
| Types/Interfaces | PascalCase | `ResearchItem`, `UserProfile` |
| Constants | SCREAMING_SNAKE | `API_BASE_URL` |

### Imports Order

1. React & React libraries
2. Third-party libraries
3. Local components
4. Local services/utils
5. Types
6. Styles/Assets

```typescript
// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

// React
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// Third-party
import { supabase } from "@supabase/supabase-js";

// Components
import { Button, Card } from "../shared/UIComponents";
import DashboardLayout from "../shared/Layouts";

// Services
import { geminiService } from "../../services/geminiService";

// Types
import type { ResearchItem, Collection } from "../../types";
```

### Performance Rules

1. **Always cleanup effects:**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {}, 1000);
  return () => clearTimeout(timer); // Cleanup!
}, []);
```

2. **Throttle expensive operations:**
```typescript
// Mousemove, scroll, resize - throttle 60ms minimum
let lastCall = 0;
const handleMouseMove = (e) => {
  if (Date.now() - lastCall < 60) return;
  lastCall = Date.now();
  // do stuff
};
```

3. **Memoize computed values:**
```typescript
const filteredItems = useMemo(() => 
  items.filter(item => item.active),
  [items]
);
```

---

## 🚫 Things to Avoid

- ❌ Hardcoding API keys (use Vercel Serverless Functions in `api/`)
- ❌ Using `any` type in TypeScript
- ❌ Inline styles (use CSS classes)
- ❌ `console.log` in production frontend code (OK in API logs)
- ❌ Forgetting cleanup in useEffect
- ❌ Walls of text in responses
- ❌ Using different AI models across endpoints (keep all on `gemini-2.5-flash`)
- ❌ Single-provider AI endpoints without fallbacks
- ❌ Being robotic or overly formal

---

## ✅ Before Submitting Changes

1. Check PART sections are in place
2. Ensure proper TypeScript types
3. Test dark mode compatibility
4. Verify cleanup functions exist
5. Remove console.logs
6. Format with Prettier

---

## 🤝 Working With Me (Kian)

- I like **concise, actionable responses**
- Show me **what changed** with tables
- Use the **PART system** - no exceptions
- Match the **Apple design aesthetic**
- Humor is welcome when things go wrong 😅
- I'll upload files individually since I'm on Claude Chat
- If I use Claude Code, you have full repo access

---

*Last Updated: March 2026 — Glass theme redesign, minimalist editorial redesign (blue accent, hairline borders), bubble playful-premium redesign (rose/lavender palette), Three.js bubble cursor (removed), OAuthPopupHandler fix, FloatingOrbs recolor, project structure updated*