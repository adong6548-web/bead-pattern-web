# AI Development Guardrails

## Purpose
Define strict workflow rules for Codex / Claude / AI coding sessions to prevent messy, over-expanded, hard-to-maintain AI-generated code.

These guardrails are mandatory for this repository. They apply to coding, documentation, refactoring, UI work, debugging, and review tasks unless the user explicitly provides different instructions.

## 1. Required Pre-Coding Workflow
For non-trivial tasks, the agent must:

- inspect `git status`
- inspect relevant files before proposing changes
- define the scope of the task
- list the active constraints
- propose a plan before editing files
- wait for explicit approval when the task is planning-only or the user asks to plan first

If the working tree is dirty, report the dirty files before editing. Do not assume existing changes are safe to overwrite.

## 2. One Task Per Session
Do not mix unrelated work in the same session or commit.

Examples of work that must not be mixed unless explicitly requested:

- autosave
- offline support
- performance optimization
- UI redesign
- color algorithm changes
- PNG export changes
- engine changes

If a task reveals another issue, report it as a follow-up instead of silently folding it into the current change.

## 3. No Self-Directed Scope Expansion
The agent must not:

- add unrequested features
- refactor unrelated code
- change behavior outside the task scope
- "improve" UI or architecture without permission
- silently introduce dependencies

Small cleanup is acceptable only when it is required to complete the requested task safely, and it must be called out in the final report.

## 4. Context Overload Detection
The agent must warn the user and recommend starting a new session when:

- context becomes confusing
- branch state is unclear
- task scope conflicts with previous instructions
- too many phases are being discussed at once
- the model is no longer confident which state is current

When this happens, pause and propose a continuity audit before making further changes.

## 5. Compatibility Code Policy
Avoid unnecessary:

- legacy branches
- duplicate fallback systems
- unused compatibility layers
- temporary bridge code

If compatibility code is required, document:

- why it is needed
- where it is used
- when it can be removed

Compatibility code should have a clear owner and a clear exit condition. Do not add defensive layers just because the agent is uncertain.

## 6. Git Hygiene
Before changes:

- run `git status`
- report dirty files
- call out unexpected files

After changes:

- summarize `git diff --stat`
- run `npm run lint`
- run `npx tsc --noEmit`
- run `npm run build`
- do not commit generated cache files such as `tsconfig.tsbuildinfo`

If a check creates generated files, clean them up before final reporting unless the user explicitly asked to keep them.

## 7. Protected Project Boundaries
Unless explicitly requested, do not change:

- `src/engine/generatePattern.ts`
- `src/engine/exportPatternImage.ts`
- PNG export behavior
- FocusMode visibility / entry
- Tailwind major version
- autosave schema
- storage model
- backend architecture

If a requested task appears to require crossing one of these boundaries, stop and ask for confirmation before editing.

## 8. UI Workflow
For UI work, prefer one of these before coding:

- Figma + MCP for highest fidelity
- ASCII layout sketch for MVP UI structure
- moodboard / visual direction for style exploration

Do not implement vague UI instructions like "make it better" without first clarifying layout, structure, and acceptance criteria.

UI changes should preserve the existing product constraints: simple MVP surface, local-first processing, no FocusMode restoration, and no unrequested feature expansion.

## 9. Skills vs SubAgents
Skills are for context-dependent but independently produced outputs, such as:

- prompts
- PR descriptions
- QA checklists
- UI copy
- design rules

SubAgents are for independent external tasks, such as:

- third-party docs reading
- isolated audits
- research

SubAgents must not take over the main project context. The primary agent remains responsible for integrating findings, preserving constraints, and deciding what belongs in the current task.

## 10. Required Final Report After Every Coding Task
The agent must report:

- files changed
- behavior changed
- behavior intentionally not changed
- constraints verified
- check results
- manual QA notes
- remaining risks
- whether it is safe to commit

If checks were not run, explain why. If warnings remain, separate known acceptable warnings from new warnings.
