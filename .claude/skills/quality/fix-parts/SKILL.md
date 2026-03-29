---
name: fix-parts
description: Audit and fix missing or malformed PART sections in a ResearchMate TypeScript file. The PART sectioning system is mandatory in every file.
disable-model-invocation: true
effort: medium
allowed-tools: Read, Edit
---

Audit and fix the PART sectioning system in: $ARGUMENTS

Steps:
1. Read the file
2. Check that PART sections exist with EXACT format (44 `=` signs):
   ```
   // ============================================
   // PART N: SECTION NAME
   // ============================================
   ```
3. Verify correct order: IMPORTS → TYPES → CONSTANTS → HELPERS → MAIN → EXPORTS
4. For complex components, check sub-sections:
   - PART 5A: STATE
   - PART 5B: EFFECTS
   - PART 5C: HANDLERS
   - PART 5D: RENDER
5. Fix any missing, malformed (wrong = count), or out-of-order sections
6. Show a before/after summary table of what was changed
