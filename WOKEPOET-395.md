---
id: WOKEPOET-395
title: >-
  Loot filter bug hunt round 2: own rule names, Alt+F keys, share fold, low maps
  look
status: Done
priority: Medium
effort: S
assignee: unassigned
tags:
  - bug
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T16:07:30.438Z'
    comment: Created ticket.
    id: a-2026-11-18t16-07-30-438z
  - type: comment
    user: Agent
    comment: Merged as PR 643 (46f3f034).
    date: '2026-11-18T16:18:12.689Z'
    completionComment: true
    id: c-2026-11-18t16-18-12-689z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T16:18:12.689Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as PR 643 (46f3f034). Own rules with an unknown base type are held
      back; Alt+F card keys are scoped to the card; share code Add folds in; low
      maps keep their tier look.
    completionComment: true
    date: '2026-11-18T16:18:13.943Z'
    id: c-2026-11-18t16-18-13-943z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T16:18:14.270Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/643'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
---
Done on branch `woke/filter-bughunt-2` (1511f583, f6f213bf) off master, and sent to merge. Follow-up to WOKEPOET-392.

- An own rule with a base type the game doesn't know is held back with a reason, because the game refused the whole filter. Item classes now get the spelling warning as well.
- Alt+F card keys (1, 2, 3, G) only act on the card, never on keys meant for another overlay window.
- Adding a share code folds its changes into yours, the way edits made in the editor fold.
- Hide low maps uses a hidden copy above NeverSink's rule, so influenced maps and maps above your zone keep their tier's look.

Dropped: boss-only uniques stay out of the net (Guy's call). The stack "Not for me" change was backed out: it never lapsed anyway.
