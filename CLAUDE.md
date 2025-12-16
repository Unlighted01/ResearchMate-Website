# CLAUDE.md - ResearchMate Project Guidelines

> This file teaches Claude how to work on this codebase. Read this first!

---

## 🎯 Project Overview

**ResearchMate** - A multi-platform research management ecosystem
- Web Dashboard (React/TypeScript/Vite)
- Chrome Extension
- Mobile App (Coming Soon)
- Smart Pen Integration (Hardware)

**Tech Stack:** React, TypeScript, Vite, Supabase, Tailwind CSS, Netlify Functions

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

### Glassmorphism Effects

```css
/* Standard glass effect */
.glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

/* Semi-transparent for bubble backgrounds */
.transparent-section {
  background: rgba(255, 255, 255, 0.5); /* bg-white/50 */
  backdrop-filter: blur(4px);
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
ResearchMate/
├── CLAUDE.md                    # You are here!
├── src/
│   ├── index.tsx                # App entry
│   ├── index.css                # Global styles + animations
│   ├── App.tsx                  # Router setup
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── SignupPage.tsx
│   │   │
│   │   ├── marketing/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   └── TeamPage.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── Statistics.tsx
│   │   │   ├── SmartPenGallery.tsx
│   │   │   ├── CitationGenerator.tsx
│   │   │   └── SettingsPage.tsx
│   │   │
│   │   └── shared/
│   │       ├── Layouts.tsx       # MarketingLayout, DashboardLayout
│   │       ├── UIComponents.tsx  # Button, Input, Card, etc.
│   │       └── BubbleBackground.tsx
│   │
│   └── services/
│       ├── supabaseClient.ts
│       ├── geminiService.ts
│       ├── storageService.ts
│       └── collectionsService.ts
│
├── netlify/
│   └── functions/               # Serverless API endpoints
│       ├── chat.ts
│       ├── summarize.ts
│       ├── extract-citation.ts
│       └── generate-tags.ts
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

- ❌ Hardcoding API keys (use Netlify Functions)
- ❌ Using `any` type in TypeScript
- ❌ Inline styles (use Tailwind classes)
- ❌ `console.log` in production code
- ❌ Forgetting cleanup in useEffect
- ❌ Walls of text in responses
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

*Last Updated: December 2024*