# ResearchMate Website — Improvement Recommendations
> Audited March 2026. Read `CLAUDE.md` and `docs/CLAUDE.md` before touching anything.
> All items numbered globally. Work top-down — each tier must be clear before moving to the next.

---

## 🔴 #1–#5 — Critical (Fix First)

---

**#1 — Hardcoded Supabase Anon Key exposed in frontend**
- **File:** `src/components/App/SmartPenGallery.tsx` lines ~42–44
- **Problem:** `const SUPABASE_ANON_KEY = "eyJhbGci..."` is a hardcoded string sitting in frontend source. It's visible to anyone who opens DevTools → Sources.
- **Fix:** Delete the constant. The `supabase` client from `src/services/supabaseClient.ts` is already imported in this file — call the edge function through it directly, no separate key needed.
- **Risk if ignored:** Anyone can call your Supabase edge functions without auth.

---

**#2 — Credits deducted before the AI call succeeds**
- **File:** `api/_utils/auth.ts`
- **Problem:** The credit decrement runs before the actual provider (Gemini/OpenRouter/Groq) responds. If the provider fails or times out, the user loses a credit permanently with no output.
- **Fix:** Move the credit deduction to after the provider returns a successful response. Add a refund path in the catch block — increment credits back if the call throws.
- **Risk if ignored:** Users will notice credits disappearing on errors and lose trust.

---

**#3 — Statistics time range filter does nothing**
- **File:** `src/components/App/Statistics.tsx`
- **Problem:** `const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week")` exists and the three buttons update it — but `timeRange` is never referenced in the `useEffect` that loads chart data. All three buttons show identical data.
- **Fix:** Pass `timeRange` into the `useEffect` dependency array and filter the fetched items by `created_at` date before building chart datasets.
- **Risk if ignored:** Looks broken. Users will report it as a bug immediately.

---

**#4 — Stat cards show hardcoded fake percentage changes**
- **File:** `src/components/App/Statistics.tsx` — the four stat cards (Total Saved, This Week, Collections, Sources)
- **Problem:** `change: "+12%"`, `change: "+8%"`, `change: "+24%"` are placeholder strings that never update. Every user, every time, sees the exact same deltas.
- **Fix:** Calculate actual week-over-week change: fetch item counts for current week vs previous week, compute `((current - previous) / previous * 100).toFixed(0) + "%"`. If previous is 0, show `"New"`.
- **Risk if ignored:** Users will notice the numbers are fake and lose confidence in the analytics.

---

**#5 — "Remember Me" checkbox is non-functional**
- **File:** `src/components/auth/LoginPage.tsx`
- **Problem:** `rememberMe` state is written to `localStorage` on login, but nothing ever reads it back. Users who check the box still have to log in manually every session.
- **Fix:** On mount, read `localStorage.getItem("researchmate_remember")`. If `"true"`, call `supabase.auth.getSession()` — if a valid session exists, skip the login form and redirect to Dashboard.
- **Risk if ignored:** Feature implies it works. Disappointed users.

---

## 🟠 #6–#14 — High (Fix Soon)

---

**#6 — Debug console logs shipping to production**
- **File:** `src/services/geminiService.ts` lines ~76–80
- **Problem:** `console.log("🔍 [GeminiService] Auth Check:")`, `console.log("   - Supabase URL Set:", !!...)`, etc. are unconditional. Any user can open DevTools and see internal auth state.
- **Fix:** Wrap every `console.log` in `if (import.meta.env.DEV) { ... }` or delete them entirely. Do a project-wide search: `grep -r "console.log" src/` and audit each hit.
- **Files to check:** `src/services/geminiService.ts`, `src/services/storageService.ts`, any component with debug-style logs.

---

**#7 — AIAssistant credit count stuck at "..." forever**
- **File:** `src/components/App/AIAssistant.tsx`
- **Problem:** `const [credits, setCredits] = useState<number | string>("...")` — initial value is the string `"..."`. There is no `useEffect` on mount that fetches the real credit count. If the credits API call inside a handler fails, the display never updates.
- **Fix:** Add a `useEffect(() => { fetchCredits().then(setCredits) }, [])` on mount. The fetch should call `api/_utils/auth.ts` `getCredits` or equivalent. Show a loading skeleton instead of `"..."` while fetching.

---

**#8 — Chat requests have no timeout and no cancel**
- **File:** `src/components/App/AIAssistant.tsx` — the `sendMessage` / chat submit handler
- **Problem:** The `fetch()` call to `api/chat.ts` has no `AbortController` and no timeout. If the API hangs, the spinner runs indefinitely with no escape.
- **Fix:** Create an `AbortController`, pass its `signal` to `fetch()`, set a `setTimeout` of 30s that calls `abort()`. Add a "Cancel" button that also calls `abort()`. Show an error toast when aborted.

---

**#9 — SmartPen camera capture has a race condition**
- **File:** `src/components/App/SmartPenGallery.tsx` — `handleCameraCapture` function
- **Problem:** After `await addItem(...)` resolves, `loadScans()` fires immediately. But `addItem` resolves when the Supabase insert returns — it doesn't wait for the realtime subscription to echo the new row back. The list reloads before the item is visible.
- **Fix:** Either (a) optimistically prepend the new item to local state before the API call, then reconcile with the realtime event, or (b) add a brief `await new Promise(r => setTimeout(r, 800))` before `loadScans()` as a quick fix. Option (a) is the right approach.

---

**#10 — Collection item counts fetch every row in the database**
- **File:** `src/services/collectionsService.ts` — the function that builds per-collection counts
- **Problem:** The current code does `supabase.from("items").select("collection_id").not("collection_id", "is", null)` — this fetches every single item row (just the one column) to count them client-side. With 10,000 items across 20 collections, that's 10,000 rows for what should be 20 count queries.
- **Fix:** For each collection, use `supabase.from("items").select("id", { count: "exact", head: true }).eq("collection_id", id)` — returns only the count, zero rows transferred. Or use a single Postgres RPC that returns counts grouped by collection_id.

---

**#11 — Double-clicking AI buttons fires duplicate requests and double-charges credits**
- **Files:** `src/components/App/Dashboard.tsx` (summarize button in item modal), `src/components/App/AIAssistant.tsx` (send button), `src/components/App/SmartPenGallery.tsx` (extract + summarize buttons)
- **Problem:** No debounce or loading-lock on these handlers. Fast double-click = two API calls = two credit deductions.
- **Fix:** Set a loading boolean in state (`isSubmitting`) and disable the button while `isSubmitting === true`. This is the simplest fix. Optionally add a content-hash dedup key in `api/_utils/auth.ts` as a server-side guard too.

---

**#12 — No per-user rate limiting on any API endpoint**
- **Files:** All files in `api/` — `summarize.ts`, `chat.ts`, `ocr.ts`, `generate-tags.ts`, `insights.ts`, `extract-citation.ts`
- **Problem:** Nothing stops a script from firing 500 requests/minute per user. The credit system slows honest users but a determined abuser can exhaust credits or hammer the providers.
- **Fix:** Add a sliding-window rate limiter in `api/_utils/auth.ts` using Vercel KV (already on Vercel) or Upstash Redis. e.g. max 20 requests/minute per `userId`. Return `429` with `Retry-After` header when exceeded.

---

**#13 — Color tag parsing silently returns undefined**
- **File:** `src/services/storageService.ts` — wherever `tags.find(t => t.startsWith("color:"))` is used
- **Problem:** `tag.split(":")[1]` on a tag like `"color:"` (no value) returns `undefined`. That undefined propagates into rendering code with no guard. Also no validation that the extracted color is a known value (e.g. `"red"`, `"blue"` — not `"xyzzy"`).
- **Fix:** Replace with `/^color:([a-zA-Z]+)$/.exec(tag)?.[1]`. Then validate against the known color enum. If invalid, treat as no color set.

---

**#14 — Custom API keys saved with no validation**
- **File:** `src/components/App/SettingsPage.tsx` — the BYOK (Bring Your Own Key) section
- **Problem:** User types a key, clicks Save, it's stored. No format check (e.g. OpenAI keys start with `sk-`, Gemini keys are 39 chars), no "Test Connection" button. User finds out the key is wrong only when a feature fails with a vague error.
- **Fix:** Add basic format validation per key type (regex). Add a "Test" button that calls a lightweight probe endpoint (e.g. `api/set-custom-key.ts` can add a `/test` action that makes a minimal API call and returns `{ok: true}` or the error message). Show result inline below the input.

---

## 🟡 #15–#24 — Medium (Should Fix)

---

**#15 — Dashboard silently caps at 100 items with no pagination**
- **File:** `src/services/storageService.ts` — `getAllItems()` function; `src/components/App/Dashboard.tsx` — where `getAllItems` is called
- **Problem:** `getAllItems()` has a default `limit: 100`. Users with 200+ items see only the first 100 with zero indication there's more. No "Load More", no page controls, no scroll trigger.
- **Fix:** Implement cursor-based infinite scroll. Pass `lastId` cursor to `getAllItems`. In Dashboard, add an `IntersectionObserver` sentinel div at the bottom of the list — when it enters the viewport, fetch the next page and append. Show a subtle "Loading more..." skeleton.

---

**#16 — All items rendered in the DOM at once (no virtualization)**
- **Files:** `src/components/App/Dashboard.tsx` (grid + list views), `src/components/App/SmartPenGallery.tsx` (scan grid)
- **Problem:** Even with 100 items loaded, all 100 card DOM nodes exist simultaneously. Scrolling becomes janky. With pagination fixed (#15), this compounds.
- **Fix:** Use `react-window` (`FixedSizeGrid` for grid view, `FixedSizeList` for list view). Only the ~20 visible cards need to be in the DOM. This is a known pattern — `react-window` docs have a direct example for masonry/card grids.

---

**#17 — Images not lazy-loaded**
- **Files:** `src/components/App/SmartPenGallery.tsx` (scan thumbnails), `src/components/App/Dashboard.tsx` (any item with an image)
- **Problem:** All `<img>` tags load immediately on render regardless of scroll position. For a gallery with 50 scans, that's 50 network requests on page open.
- **Fix:** Add `loading="lazy"` to every `<img>` tag. For any image whose `src` is computed dynamically, use an `IntersectionObserver` to set `src` only when the element is near the viewport.

---

**#18 — No duplicate detection on item add**
- **File:** `src/services/storageService.ts` — `addItem()` function
- **Problem:** Saving the same URL or uploading the same PDF twice creates two identical items with no warning.
- **Fix:** Before inserting, query `supabase.from("items").select("id").eq("user_id", userId).eq("sourceUrl", url).limit(1)`. If a row comes back, show a toast: "You've already saved this — view it?" with a link. Let the user override if they want.

---

**#19 — No bulk operations in Dashboard**
- **File:** `src/components/App/Dashboard.tsx`
- **Problem:** Users can't select multiple items to batch-delete, move to a collection, add a tag, or queue for summarization. Every action is one-at-a-time.
- **Fix:** Add a checkbox to each item card (visible on hover or via a "Select" mode toggle). Track `selectedIds: Set<string>` in state. Show a sticky bulk action bar at the bottom when `selectedIds.size > 0` with: Delete, Move to Collection, Add Tag, Generate Summaries. The extension already has this logic — mirror it.

---

**#20 — @ mention system in AIAssistant is fragile and XSS-adjacent**
- **File:** `src/components/App/AIAssistant.tsx` — mention insertion and rendering logic
- **Problem:** Mentions are injected as plain text `@ItemTitle`. If `sourceTitle` contains `<script>` or `"` characters they could break the surrounding logic. More practically, there's no way to distinguish a user-typed `@` from an actual structured mention, so the chat context builder can misfire.
- **Fix:** Store mentions as structured tokens: `{type: 'mention', id: 'item-uuid', label: 'Title'}`. Render them as styled chips in the textarea (or use a contenteditable approach). On submit, replace mention tokens with the full item context before sending to the API.

---

**#21 — No API response caching — same summarization charged twice**
- **Files:** `api/summarize.ts`, `api/summarize-item.ts`, `api/generate-tags.ts`, `api/insights.ts`
- **Problem:** Calling "Generate Summary" on an item that was already summarized makes a full new API call and charges a credit. The previous result is thrown away.
- **Fix:** Before calling the AI provider, compute a SHA-256 hash of the input text and check a cache table in Supabase (or Vercel KV). If hit, return cached result and don't deduct credits. Cache TTL: 7 days. Only meaningful for summarize/tags/insights — chat is conversational so skip that.

---

**#22 — Search results don't highlight matching text**
- **File:** `src/components/App/Dashboard.tsx` — item card rendering in both list and grid view
- **Problem:** Searching "machine learning" highlights nothing. User sees the item appears in results but can't see why or where the match is.
- **Fix:** After filtering items by search query, pass the query string down to the card component. In the card, use a helper like `highlightText(text, query)` that splits the string on the query term and wraps matches in `<mark className="search-highlight">`. Add `.search-highlight { background: var(--ui-accent); opacity: 0.3; border-radius: 2px; }` to each theme in `index.css`.

---

**#23 — Destructive actions inconsistently guarded**
- **Files:** `src/components/App/Dashboard.tsx` (item delete), `src/components/App/SmartPenGallery.tsx` (scan delete, device unpair), `src/components/App/SettingsPage.tsx` (delete account)
- **Problem:** Some deletes show a `confirm()` browser dialog, some don't. `confirm()` is also unstyled and breaks the Apple design aesthetic.
- **Fix:** Create a shared `<ConfirmDialog title message onConfirm onCancel />` component in `src/components/shared/UIComponents.tsx`. Replace all `confirm()` calls and bare-delete buttons with this component. Style it per the active theme.

---

**#24 — Auth pages fight the theme system via direct DOM class manipulation**
- **Files:** `src/components/auth/LoginPage.tsx` lines ~84–100, `src/components/auth/SignupPage.tsx` lines ~64–80
- **Problem:** Both pages `document.documentElement.classList.remove("dark")` on mount and re-add it on cleanup. This is duplicated in both files and races with ThemeContext if routes change quickly. It also doesn't account for the `visualTheme` system.
- **Fix:** Move the "force light mode" logic into `MarketingLayout` in `src/components/shared/Layouts.tsx` — one place, one source of truth. Auth pages use MarketingLayout so they'll inherit it automatically.

---

## 🟢 #25–#32 — Low (Nice to Fix)

---

**#25 — No recent search history**
- **File:** `src/components/App/Dashboard.tsx` — search input handler
- **Problem:** Search box is empty every session. Users retype the same queries repeatedly.
- **Fix:** On every search submit, push the query to a `localStorage` array (`researchmate_search_history`, max 8 entries, deduplicated). When the search input is focused and empty, render a small dropdown of recent searches below it.

---

**#26 — Keyboard shortcuts are undiscoverable**
- **File:** `src/components/App/Dashboard.tsx` — `useKeyboardShortcuts` hook usage; `src/components/App/SettingsPage.tsx`
- **Problem:** Shortcuts exist but there's no documentation anywhere in the UI. Power users are missing them entirely.
- **Fix:** Add a "Keyboard Shortcuts" section to `SettingsPage.tsx` with a simple two-column table (shortcut → action). Alternatively, add a `?` icon button in the Dashboard header that opens a `<ShortcutsModal />` overlay.

---

**#27 — Empty states are inconsistent across pages**
- **Files:** `src/components/App/Dashboard.tsx`, `src/components/App/Statistics.tsx`, `src/components/App/SmartPenGallery.tsx`, `src/components/App/AIAssistant.tsx`
- **Problem:** Some pages have illustrated empty states with helpful CTAs, others show plain text or nothing at all. Looks unfinished.
- **Fix:** Create `<EmptyState icon={ReactNode} title={string} description={string} cta={ReactNode} />` in `src/components/shared/UIComponents.tsx`. Replace all ad-hoc empty state implementations with this component. Keep the Apple design aesthetic — centered, generous spacing, muted icon.

---

**#28 — Loading states are inconsistent**
- **Files:** Multiple — Dashboard (skeletons), AIAssistant (spinner), Statistics (spinner vs nothing), SmartPenGallery (mixed)
- **Problem:** Some transitions use skeleton cards, some show a centered spinner, some show nothing until content pops in. Jarring.
- **Fix:** Establish one pattern: skeleton loaders for content areas (cards, lists, charts), inline spinners only for button actions. Create skeleton variants for the item card and stat card in `src/components/shared/UIComponents.tsx` and use them everywhere.

---

**#29 — Modal edits lost on accidental close**
- **Files:** `src/components/App/Dashboard.tsx` — item detail modal; `src/components/App/SmartPenGallery.tsx` — scan detail modal
- **Problem:** If a user edits a note or summary in the detail modal and accidentally clicks the backdrop or presses Escape, all edits are gone with no warning.
- **Fix:** Track a `isDirty` boolean — set to `true` when any field in the modal changes from its original value. On close attempt (backdrop click or Escape), if `isDirty === true`, show the `<ConfirmDialog>` from #23 with "Discard changes?" before closing.

---

**#30 — No filter by capture source in Dashboard**
- **File:** `src/components/App/Dashboard.tsx` — filter chip row
- **Problem:** Items have a `source` field (extension, web, smart_pen, mobile) but there's no filter for it. A user who mainly uses the smart pen can't quickly view only those items.
- **Fix:** Add a "Source" filter chip group to the filter bar (alongside existing tag/color chips): All · Extension · Web · Smart Pen · Mobile. Wire it into the existing filter state alongside `selectedTag` and `selectedColor`.

---

**#31 — AIAssistant "Needs Summary" queue capped at 5**
- **File:** `src/components/App/AIAssistant.tsx` — the `itemsWithoutSummary` computed value
- **Problem:** `.slice(0, 5)` hard-limits the summary suggestion list. A user with 80 unsummarized items sees only 5.
- **Fix:** Show 5 by default with a "Show all (80)" link that expands the list or opens a dedicated view. The count should come from the full unsliced array length.

---

**#32 — Gallery serves full-size images as thumbnails**
- **File:** `src/components/App/SmartPenGallery.tsx` — scan grid image tags
- **Problem:** Each scan thumbnail loads the full-resolution image and scales it down with CSS. A gallery of 30 scans at 2MB each = 60MB on load.
- **Fix:** Use Supabase Storage image transforms — append `?width=300&quality=70` to the storage URL for thumbnails. Full-res only loads when user opens the detail view. Supabase supports this natively via the `transform` option on `getPublicUrl`.

---

## 🔵 #33–#37 — Code Quality (Refactor When Touching These Files)

---

**#33 — Three oversized components that are hard to modify safely**

| File | ~Lines | Should be split into |
|---|---|---|
| `src/components/App/Dashboard.tsx` | 1347 | `ItemGrid.tsx`, `ItemList.tsx`, `ItemDetailModal.tsx`, `DashboardFilters.tsx`, `BulkActionBar.tsx` |
| `src/components/App/SettingsPage.tsx` | 1171 | `AccountSettings.tsx`, `AppearanceSettings.tsx`, `PrivacySettings.tsx`, `DataSettings.tsx`, `ApiKeySettings.tsx` |
| `src/components/App/SmartPenGallery.tsx` | 827 | `SmartPenDeviceList.tsx`, `ScanGrid.tsx`, `ScanDetailModal.tsx`, `CameraCapture.tsx` |

Do not split proactively — only when you're already editing one of these files for another fix.

---

**#34 — `any` types in API files**
- **Files:** `api/summarize.ts`, `api/chat.ts`, `api/ocr.ts`, `api/generate-tags.ts`, `api/insights.ts`
- **Problem:** `options: any` used in multiple places. TypeScript can't catch misuse.
- **Fix:** Define a proper `RequestOptions` interface per endpoint (or a shared one in `api/_utils/types.ts`). No `any` allowed per CLAUDE.md.

---

**#35 — Missing null guards on item fields**
- **Files:** `src/components/App/Dashboard.tsx`, `src/components/App/SmartPenGallery.tsx`, `src/components/App/AIAssistant.tsx`
- **Problem:** Some places call `item.text.substring(...)` without checking if `text` is null/undefined. Items from the extension can arrive with missing fields.
- **Fix:** Use optional chaining consistently: `item.text?.substring(0, 500) ?? ""`. Do a search for `.substring(` and `.toLowerCase(` across `src/` and verify each has a null guard.

---

**#36 — No tests anywhere**
- **Status:** Zero test files exist in the repo.
- **Minimum viable test suite to add:**
  - `src/services/storageService.test.ts` — unit test `addItem`, `updateItem`, color tag parsing
  - `src/services/collectionsService.test.ts` — unit test count logic
  - `api/extract-citation.test.ts` — test CrossRef waterfall logic
  - One Playwright E2E: login → save item → generate summary → verify it appears
- **Setup:** `npm install -D vitest @testing-library/react playwright`

---

**#37 — Environment variable validation is too lenient**
- **File:** `src/services/supabaseClient.ts`
- **Problem:** Only checks `if (!url || !key)` — doesn't validate that `url` is a valid URL or that `key` matches the expected JWT format. A truncated key gives a cryptic network error, not a useful startup message.
- **Fix:** Add: `if (!url.startsWith("https://") || !url.includes(".supabase.co"))` and `if (key.split(".").length !== 3)` (JWT has 3 parts). Throw a clear error with the variable name so developers can diagnose misconfiguration instantly.

---

## 📋 Master Summary

| # | Priority | Issue | Files |
|---|---|---|---|
| 1 | ✅ Fixed | Hardcoded Supabase key | `SmartPenGallery.tsx` |
| 2 | 🔴 Critical | Credits lost on API failure | `api/_utils/auth.ts` |
| 3 | 🔴 Critical | Time range filter does nothing | `Statistics.tsx` |
| 4 | 🔴 Critical | Fake hardcoded stat changes | `Statistics.tsx` |
| 5 | 🔴 Critical | Remember Me does nothing | `LoginPage.tsx` |
| 6 | 🟠 High | Debug logs in production | `geminiService.ts` + all of `src/` |
| 7 | 🟠 High | Credits stuck at "..." | `AIAssistant.tsx` |
| 8 | 🟠 High | No chat timeout or cancel | `AIAssistant.tsx` |
| 9 | 🟠 High | Race condition on scan save | `SmartPenGallery.tsx` |
| 10 | 🟠 High | Collection counts fetch all rows | `collectionsService.ts` |
| 11 | 🟠 High | Double-click = double charge | `Dashboard.tsx`, `AIAssistant.tsx`, `SmartPenGallery.tsx` |
| 12 | 🟠 High | No rate limiting on API | All `api/*.ts` |
| 13 | 🟠 High | Color tag parse returns undefined | `storageService.ts` |
| 14 | 🟠 High | API key saved without validation | `SettingsPage.tsx` |
| 15 | 🟡 Medium | 100 item cap, no pagination | `storageService.ts`, `Dashboard.tsx` |
| 16 | 🟡 Medium | No DOM virtualization | `Dashboard.tsx`, `SmartPenGallery.tsx` |
| 17 | 🟡 Medium | No image lazy loading | `Dashboard.tsx`, `SmartPenGallery.tsx` |
| 18 | 🟡 Medium | No duplicate detection | `storageService.ts` |
| 19 | 🟡 Medium | No bulk operations | `Dashboard.tsx` |
| 20 | 🟡 Medium | @ mention system fragile | `AIAssistant.tsx` |
| 21 | 🟡 Medium | No API response caching | `api/summarize.ts` + 3 others |
| 22 | 🟡 Medium | No search highlighting | `Dashboard.tsx` |
| 23 | 🟡 Medium | Inconsistent confirm dialogs | `Dashboard.tsx`, `SmartPenGallery.tsx`, `SettingsPage.tsx` |
| 24 | 🟡 Medium | Auth pages fight theme system | `LoginPage.tsx`, `SignupPage.tsx`, `Layouts.tsx` |
| 25 | 🟢 Low | No search history | `Dashboard.tsx` |
| 26 | 🟢 Low | Shortcuts undiscoverable | `Dashboard.tsx`, `SettingsPage.tsx` |
| 27 | 🟢 Low | Inconsistent empty states | `Dashboard.tsx`, `Statistics.tsx`, `SmartPenGallery.tsx`, `AIAssistant.tsx` |
| 28 | 🟢 Low | Inconsistent loading states | Multiple |
| 29 | 🟢 Low | Edits lost on modal close | `Dashboard.tsx`, `SmartPenGallery.tsx` |
| 30 | 🟢 Low | No source filter | `Dashboard.tsx` |
| 31 | 🟢 Low | Summary queue capped at 5 | `AIAssistant.tsx` |
| 32 | 🟢 Low | Full-res images as thumbnails | `SmartPenGallery.tsx` |
| 33 | 🔵 Refactor | Oversized components | `Dashboard.tsx`, `SettingsPage.tsx`, `SmartPenGallery.tsx` |
| 34 | 🔵 Refactor | `any` types in API files | `api/summarize.ts` + others |
| 35 | 🔵 Refactor | Missing null guards | `Dashboard.tsx`, `SmartPenGallery.tsx`, `AIAssistant.tsx` |
| 36 | 🔵 Refactor | No tests | Whole codebase |
| 37 | 🔵 Refactor | Env var validation weak | `supabaseClient.ts` |

---

---

## ✅ Fixed (March 2026 — Test Suite Pass)

| Issue | File | What was wrong | Fix |
|---|---|---|---|
| SettingsPage OCR import called wrong endpoint | `src/components/App/SettingsPage.tsx` | Sent `{ imageBase64, mimeType }` to `/api/extract-image` (non-existent route) | Now sends `{ image: base64DataUrl }` to `/api/ocr` |
| SettingsPage import only handled one file | `src/components/App/SettingsPage.tsx` | `e.target.files?.[0]` discarded all but the first file | `multiple` attribute added; iterates `Array.from(files)` with per-file try/catch |
| OCR confidence score never returned | `api/ocr.ts` | Response had no confidence field | Added heuristic word-count score, returned as `ocrConfidence` (0–100 integer) |
| `ocrConfidence` / `ocrEdited` missing from StorageItem | `src/services/storageService.ts` (extension) | Fields not declared; `updateItem()` didn't persist `text` edits to Supabase | Fields added to interface; `text` mapping added in DB update branch |
| Book year parsed with `new Date()` (NaN on partial dates) | `src/components/ItemDetail.tsx` (extension) | `"2024-12"` → `NaN` | Replaced with `/\d{4}/` regex |
| Smart pen scans opened without `ocrConfidence` | `src/components/SmartPenView.tsx` (extension) | `handleScanClick` never mapped `scan.ocr_confidence` | Added `ocrConfidence: scan.ocr_confidence` to the built item |
| `ocrEdited` flag not persisted to DB | `src/services/storageService.ts` + `ItemDetail.tsx` (extension) | No DB column; flag lost on page refresh | Encoded as `"ocr:edited"` tag in the `tags` array (same pattern as `color:*`) |
| Tag search ignored `item.tags` | `src/SidePanel.tsx` (extension) | Filter only checked `text`, `note`, `sourceTitle` | Added `.tags.some(...)` to `filteredItems` — skips internal `color:` and `ocr:` tags |
| Note field not editable in detail view | `src/components/ItemDetail.tsx` (extension) | `item.note` was displayed as read-only text | Added `itemNote` state + Edit/Save/Cancel inline editor wired to `updateItem({ note })` |
| Citation only returned bibliography, no in-text form | `src/services/geminiService.ts` + `ItemDetail.tsx` (extension) | `CitationResult` had only `citation: string` | Added `inTextCitation?: string` to interface; `formatInTextCitation()` generates style-correct short form from CrossRef data; citation card now shows both with separate copy buttons |

---

## ✅ Failed Test Fixes (From Test Suite — Tables 8.3, 8.5, 9.1, 9.3, 9.4) — RESOLVED March 2026

| Test ID | Issue | Files | Fix |
|---------|-------|-------|-----|
| 8.3-7 | Citation — non-standard date formats (`"2025/12"`, `"December 2025"` → `NaN`) | `CitationGenerator.tsx`, `api/extract-citation.ts` | `extractYear()` uses `/\d{4}/` regex instead of broken `new Date(x).getFullYear()` |
| T-1 (8.5-10, 8.5-11, 9.1-5) | OCR edit UI missing | `SmartPenScanModal.tsx` | Inline Edit/Save/Cancel textarea added; "Edited" badge shown when `tags` includes `"ocr:edited"` |
| T-2 (8.5-11, 9.1-5) | OCR confidence not saved or displayed | `storageService.ts`, `SettingsPage.tsx`, `SmartPenScanModal.tsx`, `SmartPenGallery.tsx` | `ocrConfidence` added to all interfaces + DB mappings; saved on bulk import and re-run OCR; colored badge rendered in modal (≥80% green, ≥60% yellow, <60% red) |
| T-3 (9.3-4) | Citation not regenerated after OCR edit | `SmartPenScanModal.tsx` | After OCR save, inline "Text updated — Re-link citation?" prompt appears when a citation already exists; triggers book re-search |
| T-4 (9.1-6) | No Retry OCR button | `SmartPenScanModal.tsx` | Already present via `onRunOCR` prop + Re-run OCR button on image panel |
| 9.4-1 | Bulk import only accepted PDF, not jpg/png | `SettingsPage.tsx` | `multiple` attribute added; `Array.from(files)` iterates all; image types routed through `/api/ocr` |

**Also fixed in this pass:**
- **#1 (Critical)** — Hardcoded Supabase anon key removed from `SmartPenGallery.tsx`; replaced with `supabase.functions.invoke()`.

---

## 🔧 Needs External Setup (Cannot Fix in Code Alone)

These gaps require infrastructure changes — Supabase dashboard config, schema migrations, or third-party service setup — before the code can be written.

---

### 🔴 [EXT] Realtime Cross-Device Sync — `NEEDS SUPABASE REPLICATION`

- **Affects:** Extension `src/SidePanel.tsx`
- **Tests blocked:** 9.5 #1 (Device A → B sync), #2 (offline reconnect), #3 (delete propagation)
- **Problem:** No `supabase.channel().on().subscribe()` exists. Changes on Device A only appear on Device B after a manual sync button press or reload.
- **Step 1 — Supabase Dashboard:** Go to your project → Table Editor → `items` → Replication tab → enable `INSERT`, `UPDATE`, `DELETE`.
- **Step 2 — Code** (add inside `SidePanel.tsx` main `useEffect`, scoped to authenticated users):
  ```ts
  const channel = supabase
    .channel("items-realtime")
    .on("postgres_changes", {
      event: "*", schema: "public", table: "items",
      filter: `user_id=eq.${user.id}`
    }, () => fetchItems())
    .subscribe();
  // add to cleanup: return () => { supabase.removeChannel(channel); subscription.unsubscribe(); }
  ```
- **Also see:** `ResearchMate Extension/docs/CLAUDE.md` → Known Gaps section for the exact implementation template.

---

*Generated March 2026 via full codebase audit. Do not start any item without reading `CLAUDE.md` first.*
