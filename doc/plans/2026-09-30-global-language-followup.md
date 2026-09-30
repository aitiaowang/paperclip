# Global language follow-up — 2026-09-30

## Problem

The global language preference existed, but the task composer and shared menus still used literal English strings. The workbench also used literal Chinese strings, and memoized composer options did not react to language changes.

## Changes

- Use the existing i18next preference for the task composer, participants, status and work-mode choices, model/workspace controls, uploads, feedback, and accessibility labels.
- Subscribe memoized child editors and option lists to language changes without replacing their draft or changing API enum values.
- Translate the workbench, recent tasks, organization/account menus, theme/server information, shared selectors, editor menus, and missing-secret prompts.
- Localize app-shipped team display names by stable catalog ID. Preserve custom employee, project, task, file, and user names.
- Preserve the existing language entry point in the organization menu, local preference storage, and cross-tab synchronization.

## Verification

- 17 targeted test files: 237 tests passed, including open-dialog language switching, draft preservation, stable submitted API values, locale parity and cross-tab preference events.
- UI typecheck and production build passed.
- Browser checked Chinese and English workbench/composer, the assignee picker, changing language in another tab while the composer remains open, and Chinese preference after reload.
- Narrow viewport visual check: the Chinese assignment prefix stays on one line.
- `git diff --check` passed.
- Token gate: 109 existing violations (78 color literals, 31 arbitrary values). Every reported source line was compared against HEAD and was unchanged by this patch; no new violations were introduced.

## Remaining scope

This patch covers the workbench and task-creation flow plus their shared UI. Other advanced pages, third-party/plugin text, backend-provided errors, and historical audit content can still contain English. User-authored content is intentionally displayed as entered.
