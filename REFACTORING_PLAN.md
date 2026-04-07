# ResearchMate Refactoring Plan

> **Purpose:** This document is a step-by-step refactoring guide for Claude Code. No new features are being added — this is purely about restructuring the existing codebase for maintainability, readability, and future extensibility.
>
> **Rule:** Every refactoring step must produce zero visual or behavioral changes. If the app looks or works differently after a step, something broke — revert and try again.

---

## Current State Assessment

### Codebase Stats
- **Total frontend lines:** ~20,700 (src/)
- **Files over 500 lines:** 13
- **Largest file:** Dashboard.tsx (1,571 lines)
- **Single CSS file:** index.css (1,728 lines)
- **API endpoints:** 11 serverless functions in `api/`

### Critical Problems Found

#### 1. God Components (files doing too much)
| File | Lines | What's crammed in |
|------|-------|--------------------|
| Dashboard.tsx | 1,571 | State, data fetching, realtime, filtering, grid view, list view, detail modal, import logic, bulk ops, collection modal |
| SettingsPage.tsx | 1,171 | Its own Toast system (!), profile, password, theme, notifications, API keys, data export, data import, backend status, account deletion |
| MarketingHome.tsx | 1,077 | Landing hero, features section, products section, team section, support CTA — all in one |
| Layouts.tsx | 885 | MarketingLayout + DashboardLayout (sidebar, topbar, notifications, profile dropdown, command palette) |
| SmartPenGallery.tsx | 827 | Gallery grid, scan viewer, OCR triggering, bulk operations, its own Toast |
| AIAssistant.tsx | 779 | Chat UI, message list, input handling, context management |
| CollectionsPage.tsx | 752 | Collections list, CRUD modals, item management |
| UIComponents.tsx | 746 | Button, Card, Badge, Modal, SearchInput, Input, Toggle, Select — all shared components in one file |
| AICitationExtractor.tsx | 717 | Citation extraction UI + all API interaction logic |
| storageService.ts | 668 | Every single Supabase CRUD operation for items |
| CitationGenerator.tsx | 616 | Citation forms, preview, format switching |
| SmartPenScanModal.tsx | 569 | Scan viewer + OCR + summary generation |
| Statistics.tsx | 561 | All charts + data processing |

#### 2. Duplicated Code
These are copy-pasted across multiple files and must be consolidated:

| Duplication | Found in |
|-------------|----------|
| `Toast` component (3 separate implementations!) | App.tsx, SettingsPage.tsx, SmartPenGallery.tsx |
| `importImageFile()` function (identical logic) | Dashboard.tsx, SettingsPage.tsx |
| OCR fetch call (`fetch("/api/ocr"...)`) | Dashboard.tsx (×2), SettingsPage.tsx, SmartPenGallery.tsx (×2) |
| Color mapping logic for highlight colors | Dashboard.tsx grid view, Dashboard.tsx list view (duplicated inline) |
| Markdown rendering config (ReactMarkdown components) | Dashboard.tsx detail modal (could be reused elsewhere) |

#### 3. Architectural Issues
- **8 direct `supabase.from()` calls in components** — should go through service layer
- **73 inline `style={{}}` attributes** — many are repeated patterns that should be CSS classes or constants
- **No custom hooks** — all state logic lives directly in components
- **SettingsPage has its own Toast** instead of using the App-level one passed via props (like Dashboard does)
- **index.css is 1,728 lines** — one monolithic stylesheet with no organization beyond comments

---

## Refactoring Phases

> **Important:** Complete each phase fully before moving to the next. Test the app after every phase. Each phase should result in zero visual/behavioral changes.

---

### Phase 1: Eliminate Duplicated Code
**Why first:** Removing duplicates before splitting files means you only have to move code once, not copy bugs into new files.

#### Step 1.1: Consolidate Toast System
The app already has a Toast + useToast in `App.tsx` that gets passed down via props. SettingsPage and SmartPenGallery ignore this and define their own.

**Action:**
- Delete the `Toast` component and `useToast` hook from `SettingsPage.tsx` (lines 44-96)
- Delete the `Toast` component and `useToast` hook from `SmartPenGallery.tsx`
- Update `SettingsPage` to accept `useToast` as a prop (same pattern as Dashboard)
- Update `SmartPenGallery` to accept `useToast` as a prop
- Update `App.tsx` routes to pass `useToast` to these components
- Verify toasts still appear correctly on all pages

#### Step 1.2: Create Shared Import/OCR Service
The `importImageFile()` function and OCR fetch logic appear in multiple places.

**Action:**
- Create `src/services/importService.ts`
- Move `importImageFile()` into it as an exported function
- Move the PDF import logic into it as `importPdfFile()`
- Move the JSON import logic into it as `importJsonFile()`
- Create a generic `runOcr(imageData: string)` function that wraps the `/api/ocr` fetch
- Update Dashboard.tsx, SettingsPage.tsx, and SmartPenGallery.tsx to import from this service
- Delete all inline OCR fetch calls and `importImageFile` definitions from components

#### Step 1.3: Extract Shared Constants
**Action:**
- Create `src/constants/colors.ts` — move highlight color definitions (the yellow/green/blue/red/purple hex mappings used in Dashboard grid + list views)
- Create `src/constants/sources.ts` — move `getSourceIcon()` and `getSourceColor()` helper functions out of Dashboard.tsx (these are reusable across any component showing research items)
- Update imports in Dashboard.tsx and anywhere else these are used

---

### Phase 2: Split UIComponents.tsx
**Why:** Every shared component in one 746-line file makes it hard to find anything and creates unnecessary bundle coupling.

**Action:**
Create individual files under `src/components/shared/`:

```
src/components/shared/
├── Button.tsx          (extracted from UIComponents.tsx)
├── Card.tsx            (extracted from UIComponents.tsx)
├── Badge.tsx           (extracted from UIComponents.tsx)
├── Modal.tsx           (extracted from UIComponents.tsx)
├── SearchInput.tsx     (extracted from UIComponents.tsx)
├── Input.tsx           (extracted from UIComponents.tsx)
├── Toggle.tsx          (extracted from UIComponents.tsx)
├── Select.tsx          (extracted from UIComponents.tsx)
├── UIComponents.tsx    (now just re-exports everything for backward compat)
└── ...existing files
```

**Critical:** Keep `UIComponents.tsx` as a barrel file that re-exports everything:
```typescript
// UIComponents.tsx (after refactor — backward compatible)
export { Button } from './Button';
export { Card } from './Card';
export { Badge } from './Badge';
export { Modal } from './Modal';
export { SearchInput } from './SearchInput';
export { Input } from './Input';
export { Toggle } from './Toggle';
export { Select } from './Select';
```

This means **no other file needs to change its imports** in this phase. Zero breakage risk.

---

### Phase 3: Split Layouts.tsx
**Why:** Marketing layout and Dashboard layout have completely different concerns. Dashboard layout alone is ~580 lines with sidebar, topbar, notifications, profile dropdown, and command palette integration.

**Action:**
```
src/components/shared/
├── layouts/
│   ├── MarketingLayout.tsx    (~300 lines — navbar + footer + scroll effects)
│   ├── DashboardLayout.tsx    (~400 lines — but will be split further below)
│   ├── DashboardSidebar.tsx   (~150 lines — nav items, collapse logic)
│   ├── DashboardTopbar.tsx    (~150 lines — search, notifications, profile, clock widget)
│   └── index.ts               (re-exports MarketingLayout + DashboardLayout)
├── Layouts.tsx                (keep as re-export barrel for backward compat)
```

**DashboardLayout.tsx** should only orchestrate the layout structure. The sidebar content and topbar content become their own components.

Update `Layouts.tsx` to re-export from the new location:
```typescript
export { MarketingLayout } from './layouts/MarketingLayout';
export { DashboardLayout } from './layouts/DashboardLayout';
```

---

### Phase 4: Split Dashboard.tsx (The Big One)
**Why:** 1,571 lines. Biggest file. Most state. Most likely to break when adding features.

#### Step 4.1: Extract Custom Hook — `useDashboardData`
**Action:**
- Create `src/hooks/useDashboardData.ts`
- Move into it: ALL useState declarations, fetchItems, loadMoreItems, realtime subscription setup, fetchCollections, the filteredItems useMemo, the stats useMemo, the allTags useMemo, debounced search logic
- The hook returns everything the UI needs:
```typescript
export function useDashboardData(showToast: Function) {
  // ...all state and data logic...
  return {
    items, filteredItems, loading, hasMore, loadingMore,
    searchQuery, setSearchQuery, stats, allTags,
    collections, isRealTimeConnected, lastSyncTime,
    selectedItems, viewMode, setViewMode,
    fetchItems, loadMoreItems, // ...etc
  };
}
```

#### Step 4.2: Extract Item Action Handlers
**Action:**
- Create `src/hooks/useDashboardActions.ts`
- Move: handleDeleteItem, confirmDeleteItem, handleColorChange, handleGenerateSummary, handleShare, handleCopyMarkdown, handleAddToCollection, handleBulkDelete, handleBulkExport, toggleItemSelection, selectAllItems, deselectAllItems, handleApplyFilters
- This hook takes items state + setters as params and returns the action handlers

#### Step 4.3: Extract View Components
**Action:**
```
src/components/App/Dashboard/
├── Dashboard.tsx              (~100-120 lines — parent compositor)
├── DashboardHeader.tsx        (~60 lines — title, realtime status, refresh, import button)
├── SearchAndFilters.tsx       (~70 lines — search input, filter button, view toggle)
├── StatsBar.tsx               (~35 lines — 4 stat cards)
├── ResearchItemCard.tsx       (~150 lines — grid card with checkbox, badges, color border)
├── ResearchItemRow.tsx        (~150 lines — list row variant)
├── ItemDetailModal.tsx        (~270 lines — full detail view with content, AI summary, actions, metadata)
├── CollectionPickerModal.tsx  (~50 lines — collection selection modal)
└── index.ts                   (re-exports Dashboard as default)
```

**Critical routing note:** `App.tsx` imports Dashboard from `./components/App/Dashboard`. After refactor, the `index.ts` barrel export means the import path doesn't change. If App.tsx uses a direct file import like `./components/App/Dashboard.tsx`, update it to `./components/App/Dashboard` (directory) or `./components/App/Dashboard/Dashboard`.

#### Step 4.4: Extract Import Logic
**Action:**
- The `handleImport` function and file input ref logic moves to use the shared `importService.ts` from Phase 1
- DashboardHeader.tsx handles the UI (button + hidden file input)
- The actual import processing calls the service functions

**Target result:** Dashboard.tsx (now Dashboard/Dashboard.tsx) is ~100-120 lines. It imports the hook, imports the sub-components, and wires them together. That's it.

---

### Phase 5: Split SettingsPage.tsx
**Why:** 1,171 lines. Second biggest. Has tabs that are completely independent of each other.

**Action:**
```
src/components/App/Settings/
├── SettingsPage.tsx              (~100 lines — tab navigation + tab renderer)
├── AccountTab.tsx                (~150 lines — profile card, email, account ID, provider info)
├── SecurityTab.tsx               (~100 lines — password change form)
├── AppearanceTab.tsx             (~120 lines — theme toggle, visual theme selector)
├── NotificationsTab.tsx          (~60 lines — email notifications, weekly digest, AI suggestions toggles)
├── DataTab.tsx                   (~200 lines — export, import, storage stats, uses shared importService)
├── ApiKeysTab.tsx                (~100 lines — custom Gemini API key management)
├── DangerZoneTab.tsx             (~80 lines — account deletion)
├── useSettingsData.ts            (~100 lines — user fetch, backend status, stats fetch, API key state)
└── index.ts                     (re-exports SettingsPage as default)
```

**Note:** After Phase 1, SettingsPage no longer has its own Toast — it uses the shared one from props. And it no longer has inline import logic — it uses importService.

---

### Phase 6: Split MarketingHome.tsx
**Why:** 1,077 lines. Three completely separate page sections crammed together.

**Action:**
```
src/components/marketing/
├── MarketingHome.tsx          (~50 lines — just composes the sections in order)
├── HeroSection.tsx            (~200 lines — hero banner, CTA buttons, animated elements)
├── FeaturesSection.tsx        (~250 lines — feature cards grid)
├── ProductsSection.tsx        (~300 lines — product showcases with details)
├── TeamSection.tsx            (~200 lines — team member cards)
├── CTASection.tsx             (~80 lines — final call-to-action banner)
```

---

### Phase 7: Split Remaining Large Components
Apply the same pattern to the remaining 500+ line files:

#### SmartPenGallery.tsx (827 lines)
```
src/components/App/SmartPen/
├── SmartPenGallery.tsx        (~100 lines — parent)
├── useSmartPenData.ts         (~120 lines — fetch scans, realtime, state)
├── ScanGrid.tsx               (~150 lines — gallery grid of scan cards)
├── ScanCard.tsx               (~100 lines — individual scan thumbnail)
├── ScanActions.tsx            (~100 lines — OCR, summarize, delete actions)
└── index.ts
```

#### AIAssistant.tsx (779 lines)
```
src/components/App/AIAssistant/
├── AIAssistant.tsx            (~80 lines — parent layout)
├── useChatSession.ts          (~150 lines — message state, send logic, context)
├── ChatMessageList.tsx        (~150 lines — scrollable message area)
├── ChatMessage.tsx            (~100 lines — individual message bubble)
├── ChatInput.tsx              (~100 lines — input bar with send button)
└── index.ts
```

#### CollectionsPage.tsx (752 lines)
```
src/components/App/Collections/
├── CollectionsPage.tsx        (~80 lines — parent)
├── useCollectionsData.ts      (~100 lines — fetch, CRUD state)
├── CollectionGrid.tsx         (~120 lines — collection cards)
├── CollectionCard.tsx         (~80 lines — individual card)
├── CollectionFormModal.tsx    (~100 lines — create/edit modal)
├── CollectionDetailView.tsx   (~150 lines — items within a collection)
└── index.ts
```

#### AICitationExtractor.tsx (717 lines)
```
src/components/App/Citations/
├── AICitationExtractor.tsx    (~80 lines — parent)
├── CitationExtractorForm.tsx  (~150 lines — URL/text input form)
├── CitationPreview.tsx        (~150 lines — extracted citation display)
├── CitationActions.tsx        (~80 lines — copy, export, save actions)
└── index.ts
```

#### CitationGenerator.tsx (616 lines)
Split similarly — form sections by citation type (book, article, website) become separate components.

#### Statistics.tsx (561 lines)
```
src/components/App/Statistics/
├── Statistics.tsx             (~60 lines — parent layout)
├── useStatsData.ts            (~100 lines — data fetching + processing)
├── ActivityChart.tsx           (~100 lines)
├── SourceBreakdown.tsx        (~80 lines)
├── TagCloud.tsx               (~80 lines)
├── StatsCards.tsx             (~60 lines)
└── index.ts
```

#### SmartPenScanModal.tsx (569 lines)
```
src/components/App/SmartPen/
├── SmartPenScanModal.tsx      (~80 lines — modal wrapper)
├── ScanImageViewer.tsx        (~100 lines — image display + zoom)
├── ScanOcrPanel.tsx           (~120 lines — OCR text display + actions)
├── ScanMetadata.tsx           (~60 lines — scan details, confidence, timestamps)
```

---

### Phase 8: Split CSS
**Why:** 1,728 lines in one file. Hard to find anything.

**Action:**
Split `index.css` into logical files and import them from a root `index.css`:

```
src/styles/
├── index.css              (imports all others)
├── variables.css          (CSS custom properties — colors, gradients, spacing)
├── base.css               (reset, typography, scrollbar, selection)
├── theme-dark.css         (dark mode overrides)
├── theme-glass.css        (glassmorphism theme styles)
├── theme-bubble.css       (bubble theme styles)
├── theme-minimal.css      (minimal theme styles)
├── components.css         (shared component styles — buttons, cards, modals, inputs)
├── animations.css         (keyframes, transitions, hover effects)
├── layout.css             (sidebar, topbar, grid systems, responsive)
├── utilities.css          (helper classes — sr-only, truncate, etc.)
```

Update `index.html` or Vite config to point to the new entry CSS file.

---

### Phase 9: Clean Up Services Layer
**Why:** Components are making direct supabase calls instead of going through services.

**Action:**
- Audit all 8 direct `supabase.from()` calls in components
- Move each one into the appropriate service file (`storageService.ts`, `collectionsService.ts`, or create new ones if needed)
- `storageService.ts` at 668 lines could be split into `itemsService.ts` (CRUD) and `realtimeService.ts` (subscriptions) if needed
- Components should never import `supabase` directly — only service functions

---

## File Structure After Refactoring

```
src/
├── components/
│   ├── App/
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── SearchAndFilters.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   ├── ResearchItemCard.tsx
│   │   │   ├── ResearchItemRow.tsx
│   │   │   ├── ItemDetailModal.tsx
│   │   │   ├── CollectionPickerModal.tsx
│   │   │   └── index.ts
│   │   ├── Settings/
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── AccountTab.tsx
│   │   │   ├── SecurityTab.tsx
│   │   │   ├── AppearanceTab.tsx
│   │   │   ├── NotificationsTab.tsx
│   │   │   ├── DataTab.tsx
│   │   │   ├── ApiKeysTab.tsx
│   │   │   ├── DangerZoneTab.tsx
│   │   │   ├── useSettingsData.ts
│   │   │   └── index.ts
│   │   ├── SmartPen/
│   │   │   ├── SmartPenGallery.tsx
│   │   │   ├── useSmartPenData.ts
│   │   │   ├── ScanGrid.tsx
│   │   │   ├── ScanCard.tsx
│   │   │   ├── ScanActions.tsx
│   │   │   ├── SmartPenScanModal.tsx
│   │   │   ├── ScanImageViewer.tsx
│   │   │   ├── ScanOcrPanel.tsx
│   │   │   ├── ScanMetadata.tsx
│   │   │   └── index.ts
│   │   ├── AIAssistant/
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── useChatSession.ts
│   │   │   ├── ChatMessageList.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── index.ts
│   │   ├── Collections/
│   │   │   ├── CollectionsPage.tsx
│   │   │   ├── useCollectionsData.ts
│   │   │   ├── CollectionGrid.tsx
│   │   │   ├── CollectionCard.tsx
│   │   │   ├── CollectionFormModal.tsx
│   │   │   ├── CollectionDetailView.tsx
│   │   │   └── index.ts
│   │   ├── Citations/
│   │   │   ├── AICitationExtractor.tsx
│   │   │   ├── CitationExtractorForm.tsx
│   │   │   ├── CitationPreview.tsx
│   │   │   ├── CitationActions.tsx
│   │   │   ├── CitationGenerator.tsx
│   │   │   └── index.ts
│   │   ├── Statistics/
│   │   │   ├── Statistics.tsx
│   │   │   ├── useStatsData.ts
│   │   │   ├── ActivityChart.tsx
│   │   │   ├── SourceBreakdown.tsx
│   │   │   ├── TagCloud.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   └── index.ts
│   │   ├── CameraCapture.tsx          (316 lines — fine as is)
│   │   ├── LibrarySearch.tsx          (233 lines — fine as is)
│   │   ├── PairSmartPen.tsx           (small — fine as is)
│   │   └── SmartPenPairing.tsx        (291 lines — fine as is)
│   ├── auth/
│   │   ├── LoginPage.tsx              (460 lines — could split but lower priority)
│   │   └── SignupPage.tsx             (424 lines — could split but lower priority)
│   ├── icons/                         (no changes needed)
│   ├── marketing/
│   │   ├── MarketingHome.tsx          (compositor only)
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── ProductsSection.tsx
│   │   ├── TeamSection.tsx
│   │   ├── CTASection.tsx
│   │   ├── FloatingOrbs.tsx           (fine as is)
│   │   ├── SupportPage.tsx            (fine as is)
│   │   └── LandingPage.tsx            (320 lines — fine as is)
│   └── shared/
│       ├── layouts/
│       │   ├── MarketingLayout.tsx
│       │   ├── DashboardLayout.tsx
│       │   ├── DashboardSidebar.tsx
│       │   ├── DashboardTopbar.tsx
│       │   └── index.ts
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Modal.tsx
│       ├── SearchInput.tsx
│       ├── Input.tsx
│       ├── Toggle.tsx
│       ├── Select.tsx
│       ├── UIComponents.tsx           (barrel re-export only)
│       ├── Layouts.tsx                (barrel re-export only)
│       ├── AdvancedSearchFilter.tsx   (281 lines — fine)
│       ├── BulkActions.tsx            (fine)
│       ├── ClockWidget.tsx            (fine)
│       ├── CommandPalette.tsx         (336 lines — fine)
│       ├── ConfirmDialog.tsx          (fine)
│       ├── EmptyState.tsx             (fine)
│       ├── ErrorBoundary.tsx          (fine)
│       ├── ErrorMessage.tsx           (fine)
│       ├── GlassBubble.tsx            (298 lines — fine)
│       ├── KeyboardShortcutsModal.tsx (fine)
│       ├── OfflineDetector.tsx        (fine)
│       ├── SkeletonLoader.tsx         (fine)
│       ├── AnimateOnScroll.tsx        (fine)
│       ├── BubbleBackground.tsx       (fine)
│       └── CursorBubble.tsx           (fine)
├── constants/
│   ├── colors.ts                      (highlight colors, source colors)
│   └── sources.ts                     (getSourceIcon, getSourceColor)
├── context/                           (no changes needed)
│   ├── ThemeContext.tsx
│   └── NotificationContext.tsx
├── hooks/
│   ├── useKeyboardShortcuts.ts        (existing — fine)
│   ├── useDashboardData.ts            (new — extracted from Dashboard)
│   ├── useDashboardActions.ts         (new — extracted from Dashboard)
│   ├── useChatSession.ts              (new — extracted from AIAssistant)
│   ├── useCollectionsData.ts          (new — extracted from CollectionsPage)
│   ├── useSmartPenData.ts             (new — extracted from SmartPenGallery)
│   ├── useStatsData.ts               (new — extracted from Statistics)
│   └── useSettingsData.ts             (new — extracted from SettingsPage)
├── services/
│   ├── supabaseClient.ts             (no changes)
│   ├── storageService.ts             (existing — audit for cleanup)
│   ├── collectionsService.ts         (existing — no changes)
│   ├── geminiService.ts              (existing — no changes)
│   └── importService.ts              (new — consolidated import/OCR logic)
├── styles/
│   ├── index.css                      (imports all below)
│   ├── variables.css
│   ├── base.css
│   ├── theme-dark.css
│   ├── theme-glass.css
│   ├── theme-bubble.css
│   ├── theme-minimal.css
│   ├── components.css
│   ├── animations.css
│   ├── layout.css
│   └── utilities.css
├── types.ts                           (no changes needed — already well organized)
├── utils/
│   ├── export.ts                      (existing — fine)
│   └── markdownGenerator.ts           (existing — fine)
├── App.tsx                            (update imports, pass useToast to Settings + SmartPen)
└── index.tsx                          (no changes)
```

---

## Execution Rules for Claude Code

### General Rules
1. **One phase at a time.** Finish and verify before starting the next.
2. **Test after every step.** Run `npm run dev` and check the app works.
3. **Barrel exports for backward compatibility.** When moving files into directories, the old import path should still work via an index.ts re-export.
4. **No new features.** Don't "improve" things while refactoring. Don't add new functionality. Don't change styling. Don't upgrade dependencies.
5. **Git commit after each phase.** Use descriptive commit messages like `refactor: Phase 1 - consolidate duplicate Toast and import logic`.
6. **If something breaks, revert the step.** Don't try to fix forward.

### Component Extraction Pattern
When extracting a section of JSX into a new component:
1. Identify the JSX block and all state/handlers it uses
2. Create the new component file
3. Define its props interface based on what it needs from the parent
4. Copy the JSX into the new component
5. Import and render the new component in the parent, passing required props
6. Verify rendering is identical
7. Delete the old inline JSX from the parent

### Custom Hook Extraction Pattern
When extracting state logic into a custom hook:
1. Identify all `useState`, `useEffect`, `useCallback`, `useMemo` that belong together
2. Create the hook file with a clear return type
3. Move the state declarations and effects into the hook
4. Return everything the component needs
5. In the component, call the hook and destructure
6. Verify all functionality works

### Import Path Strategy
When `Dashboard.tsx` moves to `Dashboard/Dashboard.tsx`:
- Add `Dashboard/index.ts` that exports: `export { default } from './Dashboard'`
- **Check App.tsx** — if it imports `from './components/App/Dashboard'`, the directory index.ts handles it
- If it imports `from './components/App/Dashboard.tsx'` (with extension), update to drop the extension

---

## Priority Order

If time or energy is limited, here's what gives the most bang for the buck:

1. **Phase 1 (duplicates)** — highest ROI, prevents bugs from spreading
2. **Phase 4 (Dashboard)** — biggest file, most likely to need changes
3. **Phase 5 (SettingsPage)** — second biggest
4. **Phase 2 (UIComponents)** — quick win, low risk
5. **Phase 3 (Layouts)** — medium effort, good payoff
6. **Phase 6-7 (remaining components)** — do these as you touch each file
7. **Phase 8 (CSS)** — lowest priority, highest tedium
8. **Phase 9 (services)** — do alongside other phases as you notice violations

---

## Success Criteria

After all phases are complete:
- [ ] No file in `src/components/` exceeds 300 lines
- [ ] No duplicate Toast implementations exist
- [ ] No duplicate import/OCR logic exists
- [ ] No component imports `supabase` directly (only services)
- [ ] Every directory with split components has an `index.ts` barrel export
- [ ] All existing routes work identically
- [ ] All existing features work identically
- [ ] App builds with zero new warnings (`npm run build`)
- [ ] Theme switching still works across all themes
- [ ] Realtime sync still works on Dashboard
- [ ] Smart Pen pairing and gallery still work
- [ ] AI features (chat, summarize, citations) still work
- [ ] Import/export still works
- [ ] All keyboard shortcuts still work
