# Development & delivery workflow (Aquatech)

This document is the canonical process for ticket-sized work across Aquatech repos. Cursor agents and humans follow the same stages.

## 1. Branch per repo

- Create a **new branch from `main`** in **every repo** touched by the change.
- Naming: **`feat/<ticket-or-topic>-<short-slug>`** or **`fix/...`** as appropriate.
- The branch name (or slug) must make it obvious **what we are building**.

## 2. Local iteration

- Implement and run the frontend **locally** until behavior matches the acceptance notes from the ticket or chat.
- Fix linter issues on edited files before push.

## 3. Tests (when they add signal)

- Add or extend tests when they protect real behavior or regressions—not for every cosmetic change.
- Bias toward tests when the change touches routing, permissions, forms, or data mutations.

## 4. Push and pull request

- Push the branch (+ upstream if needed).
- Open a **pull request into `main`** (e.g. `gh pr create`).
- **PR body**: summarize intent, scope, risks, and test plan abstracted from the Cursor chat / ticket.

## 5. Review, merge, close

- Wait for approval; merge after approval.
- Close the agent session once merged state is confirmed and **`session.json`** is updated.

## Session log (`session/` — not committed)

- **`session/YYYY-MM-DD/session.json`** at repo root for each repo involved.
- Duplicate across repos when a single change spans API + frontend.
- **`session/` is in `.gitignore`** — dated folders are never committed.

### Suggested `session.json` shape

```json
{
  "date": "YYYY-MM-DD",
  "title": "Short feature name",
  "ticket": "optional id or URL",
  "repos": [{ "name": "Aquatech_front", "branch": "feat/..." }],
  "summary": "1–3 sentences",
  "prUrls": [],
  "status": "in_progress | pr_open | merged",
  "chatAbstract": "Bullets from the Cursor chat"
}
```

## Mirror

The same workflow text lives in **Aquatech_api** (`docs/DEVELOPMENT_WORKFLOW.md`) so both repos stay aligned.
