---
id: WOKEPOET-355
title: One item name reader for league variants
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - cleanup
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T09:43:55.404Z'
    comment: Created ticket.
    id: a-2026-11-17t09-43-55-404z
  - type: activity
    user: Agent
    date: '2026-11-17T09:43:55.404Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t09-43-55-404z
  - type: status_change
    from: Backlog
    to: In Progress
    user: Agent
    date: '2026-11-17T09:47:44.438Z'
  - type: comment
    user: Agent
    comment: >-
      PR #575 (woke/item-names): shared/item-identity.ts, ~13 files moved onto
      it, no behaviour change. Local checks + e2e pass. Waiting for merge.
    date: '2026-11-17T09:51:57.806Z'
    completionComment: true
    id: c-2026-11-17t09-51-57-806z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-17T09:51:57.807Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as f4fdc4f6: shared/item-identity.ts reads Foulborn, Replica, Fated
      and transfigured names; 13 files use it. No behaviour change.
    completionComment: true
    date: '2026-11-17T10:03:42.822Z'
    id: c-2026-11-17t10-03-42-822z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-17T10:03:43.206Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/575'
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
> **TL;DR:** Foulborn, transfigured and Fated names are stripped by hand in about ten files. One shared reader tells every tool the plain name and the variant.

Audit finding 4. Add `readItemName(name) -> { plain, variant }` and use it in search, item menu, tooltip text, game icons, disenchant, loot filter drop uniques, PoB unique prices. Check whether "no price check for Foulborn" in the item menu is on purpose before touching it.
