---
id: WOKEPOET-182
title: >-
  UI 2: move the picked game-look pieces into woke/ui as shared components and
  tokens
status: Grooming
priority: Medium
effort: L
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-169
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:15.642Z'
    comment: Created as subtask of WOKEPOET-169.
---
After UI 1 is picked. Lift the chosen pieces out of `price-insight/` into `renderer/src/web/woke/ui/` (WPanel frame variant, header, separators, buttons, chips), driven by `--w-*` tokens so all four themes still work, then make the price check use the shared ones.

Fold in the token leftovers from the review while here: one size family (retire `--w-text`, `--w-text-sm`, `--w-head-size`, used in 12 files), the ~15 literal font sizes, and the 48 literal corner radii (`poe-mode.css` has 11). Update `woke/ui/README.md` and the charter.
