---
name: security-scan
description: Scan the ResearchMate codebase for security issues — hardcoded API keys, auth bypasses, exposed secrets, XSS risks, and missing credit refunds
context: fork
agent: Explore
effort: high
disable-model-invocation: true
allowed-tools: Grep, Read, Glob
---

Run a security scan on the ResearchMate codebase.

Scope: $ARGUMENTS (if empty, scan entire codebase)

## 1. Hardcoded secrets
Search for:
- Patterns: `sk-`, `AIza`, `Bearer `, `gsk_`, actual key strings
- In: src/, api/, supabase/
- Skip: .env, env.example, node_modules

## 2. Auth pattern audit (api/)
Every endpoint MUST have one of:
- `authenticateUser(req)` call before any data access
- Smart Pen bypass: `req.headers['x-smart-pen-key'] === process.env.SMART_PEN_SERVICE_KEY`

Flag any endpoint missing both.

## 3. Credit refund audit (api/)
Every AI endpoint MUST have:
- `creditDeducted` + `deductedUserId` flags before try block
- `refundCredit(deductedUserId)` in catch block

Flag any AI endpoint missing this pattern.

## 4. XSS risks (src/)
- `dangerouslySetInnerHTML` without sanitization
- User input rendered as HTML

## 5. .gitignore coverage
Must cover: `.env`, `.env.local`, `*.local`, `*.key`

## Output
Group by severity: CRITICAL → HIGH → MEDIUM → LOW
Each finding: file:line + description + suggested fix
