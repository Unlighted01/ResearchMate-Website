# ResearchMate Refactoring — Claude Code Setup Guide

> **Purpose:** This doc tells Claude Code (and you) exactly which skills, sub-agents, and strategies to use when executing `REFACTORING_PLAN.md`. Read this BEFORE starting any refactoring work.

---

## 1. Install the Code Refactoring Skill

This community skill auto-monitors file sizes and flags bloat before Claude Code makes it worse. Install it globally so it works on all projects.

```bash
pnpm dlx add-skill https://github.com/WomenDefiningAI/claude-code-skills/code-refactoring
```

**What it does:**
- 150-200 lines → ⚠️ Warning: file is getting large
- 200-300 lines → 🚨 Alert: should split before adding more
- 300+ lines → 🛑 Stop: must refactor before editing

This prevents future bloat after the refactoring is done. It also helps DURING refactoring — if a newly split file is still over 200 lines, it'll flag it.

---

## 2. Create Custom Sub-Agents

Create these agent files in `~/.claude/agents/` (global) or `.claude/agents/` (project-level). These are specialized workers for the refactoring job.

### Agent 1: Refactor Auditor (read-only validation)

Create file: `~/.claude/agents/refactor-auditor.md`

```markdown
---
name: refactor-auditor
description: Audits refactoring plans against the actual codebase. Read-only — never modifies files. Use this to validate proposed file splits, check import chains, find circular dependencies, and verify barrel export strategies before executing changes.
model: sonnet
tools:
  - Read
  - Glob
  - Grep
---

You are a senior frontend architect performing a read-only audit of a proposed refactoring plan.

## Your Job
- Read the refactoring plan document
- Trace actual imports and exports in the codebase
- Verify that proposed file splits won't create circular dependencies
- Check that barrel export paths will resolve correctly
- Flag any components, hooks, or utilities the plan missed
- Identify shared state or context that would break if naively split
- Report findings WITHOUT making any changes

## Output Format
For each phase in the plan, report:
1. ✅ Feasible as-is
2. ⚠️ Feasible with modifications (explain what needs to change)
3. ❌ Will break (explain why and suggest alternative)

## Rules
- NEVER modify any files
- NEVER suggest new features — only validate the refactoring structure
- Trace every import chain to confirm no circular deps would be created
- Check tsconfig paths and aliases that might affect imports
- Verify that components using React context will still have access after splitting
```

### Agent 2: Refactor Executor (does the actual work)

Create file: `~/.claude/agents/refactor-executor.md`

```markdown
---
name: refactor-executor
description: Executes one phase of the refactoring plan at a time. Extracts components, creates hooks, sets up barrel exports, and verifies the build still works. Use for mechanical code splitting tasks.
model: sonnet
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

You are a refactoring specialist executing a specific phase from REFACTORING_PLAN.md.

## Your Job
- Execute exactly ONE phase at a time (the user will tell you which)
- Extract components, hooks, and utilities as specified in the plan
- Create barrel export files (index.ts) for backward compatibility
- Run `npm run build` after each phase to verify nothing broke
- If the build fails, fix the issue before moving on

## Rules
- NEVER add new features, new UI, or new functionality
- NEVER change component behavior or styling
- NEVER refactor code the plan doesn't mention
- ALWAYS create barrel exports so existing import paths don't break
- ALWAYS preserve the exact same props interface when extracting components
- ALWAYS copy related TypeScript types/interfaces to the new file
- Git commit after completing each phase with message: `refactor: Phase X - [description]`

## Extraction Pattern
When extracting a component:
1. Read the source file completely
2. Identify the JSX block + all state/handlers it uses
3. Create new file with proper imports
4. Define props interface for everything passed from parent
5. Move the code
6. Import and render in parent with correct props
7. Verify with `npm run build`

When extracting a hook:
1. Identify all useState, useEffect, useCallback, useMemo that belong together
2. Create hook file with explicit return type
3. Move state + effects into hook
4. Call hook in component and destructure return values
5. Verify with `npm run build`
```

### Agent 3: Refactor Verifier (post-refactor checks)

Create file: `~/.claude/agents/refactor-verifier.md`

```markdown
---
name: refactor-verifier
description: Runs after a refactoring phase to verify nothing broke. Checks build, traces imports, counts file sizes, and confirms feature parity. Read-only plus build/dev commands only.
model: sonnet
tools:
  - Read
  - Bash
  - Glob
  - Grep
---

You are a QA specialist verifying that a refactoring phase was completed correctly.

## Your Job
After a refactoring phase, run these checks:

### 1. Build Check
```bash
npm run build
```
Must complete with zero new errors or warnings.

### 2. File Size Check
```bash
find src/ -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20
```
No component file should exceed 300 lines after refactoring.

### 3. Import Check
Verify all barrel exports resolve correctly:
```bash
grep -r "from.*components/App/Dashboard" src/ --include="*.tsx" --include="*.ts"
```
All existing import paths should still work.

### 4. Duplicate Check
```bash
grep -rn "const Toast:" src/ --include="*.tsx"
```
After Phase 1, there should be exactly ONE Toast implementation.

### 5. Feature Parity
Run `npm run dev` and confirm the app loads without console errors.

## Output Format
Report as a checklist:
- [ ] Build passes
- [ ] No file exceeds 300 lines
- [ ] All imports resolve
- [ ] No duplicates remain
- [ ] App runs without errors
```

---

## 3. Built-in Sub-Agents to Leverage

Claude Code already has built-in agents that are useful during refactoring. You don't need to install these — just know when to invoke them:

| Built-in Agent | When to Use |
|----------------|-------------|
| **Explore** | "Use the Explore agent to find all files that import from Dashboard.tsx" — codebase search without polluting main context |
| **Plan** | "Use the Plan agent to analyze Phase 4 of REFACTORING_PLAN.md and create a step-by-step execution order" — architectural planning |
| **General-purpose** | For complex multi-step operations where both reading and writing are needed |

---

## 4. Recommended Workflow

### Step 0: Preparation
```
Read REFACTORING_PLAN.md and CLAUDE_CODE_SETUP.md
```

### Step 1: Validate the Plan (costs ~1 window, saves many)
```
Use the refactor-auditor agent to audit REFACTORING_PLAN.md against 
the actual codebase. Check every phase for feasibility. Flag anything 
that would break.
```

### Step 2: Execute Phase by Phase
```
Use the refactor-executor agent to execute Phase 1 of 
REFACTORING_PLAN.md. Only Phase 1, nothing else.
```

### Step 3: Verify After Each Phase
```
Use the refactor-verifier agent to check that Phase 1 was 
completed correctly. Run all verification checks.
```

### Step 4: Commit and Move On
```bash
git add -A && git commit -m "refactor: Phase 1 - consolidate duplicates"
```

Then repeat Steps 2-4 for each subsequent phase.

---

## 5. Token-Saving Rules

These are critical on a Pro plan with ~44K tokens per 5-hour window:

### Use Sonnet, Not Opus
Refactoring is mechanical work. Sonnet handles it fine and burns fewer tokens.
```
/model sonnet
```

### Compact Between Phases
After each phase, compress context before starting the next:
```
/compact
```

### One Phase Per Session
Don't try to do multiple phases in one session. The context builds up and you'll hit limits faster. Commit, close the session, start fresh.

### Be Specific About Files
Instead of "look at the codebase," tell Claude Code exactly which file:
```
# Bad (Claude Code will explore everything)
"Refactor the Dashboard component"

# Good (Claude Code reads one file)
"Read src/components/App/Dashboard.tsx and extract lines 121-580 
into a custom hook called useDashboardData in src/hooks/useDashboardData.ts"
```

### Use Sub-Agents for Exploration
When Claude Code needs to search the codebase, explicitly ask for a sub-agent:
```
"Use the Explore agent to find every file that imports Toast from 
SettingsPage.tsx or SmartPenGallery.tsx"
```
This keeps the search results out of your main context window.

### Skip CSS Refactoring If Low on Tokens
Phase 8 (CSS splitting) is the lowest priority and most tedious. Save it for a week when you have spare token budget.

---

## 6. Emergency Recovery

If a phase goes wrong and the app breaks:

```bash
# Revert everything from the current phase
git checkout -- .

# Or if you already committed the broken state
git reset --hard HEAD~1
```

Then start the phase again in a fresh Claude Code session. Don't try to debug a broken refactoring — it's always faster to revert and redo cleanly.

---

## 7. Success Checklist

After all phases are complete, run this final verification:

```bash
# Build check
npm run build

# File size audit — nothing over 300 lines
find src/components/ -name "*.tsx" | xargs wc -l | sort -rn | head -20

# No duplicate Toasts
grep -rn "const Toast:" src/ --include="*.tsx" | wc -l
# Expected: 1

# No duplicate importImageFile
grep -rn "const importImageFile" src/ --include="*.tsx" --include="*.ts" | wc -l
# Expected: 1 (in importService.ts)

# No direct supabase calls in components
grep -rn "supabase\.from" src/components/ --include="*.tsx" | wc -l
# Expected: 0

# All barrel exports exist
ls src/components/App/Dashboard/index.ts
ls src/components/App/Settings/index.ts
ls src/components/App/SmartPen/index.ts
ls src/components/App/AIAssistant/index.ts
ls src/components/App/Collections/index.ts
ls src/components/App/Citations/index.ts
ls src/components/App/Statistics/index.ts
ls src/components/shared/layouts/index.ts
```
