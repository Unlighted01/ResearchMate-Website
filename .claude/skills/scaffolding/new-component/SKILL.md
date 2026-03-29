---
name: new-component
description: Scaffold a new ResearchMate React component with full PART sections, Apple design system, dark mode variants, and TypeScript. Reads existing components first to match exact patterns.
context: fork
agent: general-purpose
effort: high
disable-model-invocation: true
allowed-tools: Read, Glob, Write
---

Create a new React component for ResearchMate.

Component name and location from $ARGUMENTS (e.g. "UserCard in src/components/App/").

Steps:
1. Read 1-2 similar existing components in the same folder to match exact patterns
2. Generate the complete component file with ALL PART sections (44 `=` signs each):
   - PART 1: IMPORTS & DEPENDENCIES
   - PART 2: TYPE DEFINITIONS
   - PART 3: CONSTANTS & CONFIGURATION
   - PART 4: HELPER FUNCTIONS
   - PART 5: MAIN COMPONENT
     - PART 5A: STATE
     - PART 5B: EFFECTS
     - PART 5C: HANDLERS
     - PART 5D: RENDER
   - PART 6: EXPORTS
3. Apply Apple design system:
   - Buttons: `rounded-full`, `bg-[#007AFF]`, `active:scale-95`
   - Cards: `rounded-2xl`, `bg-white/50 dark:bg-white/5`, `backdrop-blur-md`
   - Always include `dark:` variants for every color class
4. Cleanup useEffect timers and subscriptions
5. No `any` types, no `console.log`, no inline styles
6. Write the file to the correct path
7. Show a summary table: file path, PART sections created, design tokens used
