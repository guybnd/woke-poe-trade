---
id: WOKEPOET-478
title: 'Market sidebar: full category names, header wrap, missing icons'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags:
  - market
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T10:15:20.418Z'
    comment: Created ticket.
    id: a-2026-11-22t10-15-20-418z
  - type: comment
    user: Agent
    comment: PR 759 merged after review and green checks.
    date: '2026-11-22T10:29:51.730Z'
    completionComment: true
    id: c-2026-11-22t10-29-51-730z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T10:29:51.730Z'
  - type: comment
    user: Agent
    comment: >-
      Merged: sidebar sizes to its longest name (11rem to min(18rem, 35%)),
      headers nowrap, icons for Scrying Orbs, Forbidden Jewels,
      Blighted/Blight-ravaged Maps, Incursion Temples, Beasts (+ Valdo Maps,
      Scarabs, Memories).
    completionComment: true
    date: '2026-11-22T10:29:55.460Z'
    id: c-2026-11-22t10-29-55-460z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T10:29:55.885Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/759'
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
Market › Prices category sidebar: "Equipment & gems" header wrapped out of its bar; names cut off with "…" (Unique Weapons, Forbidden Jewels, Blight-ravaged Maps…); no icons for Scrying Orbs, Forbidden Jewels, Blighted/Blight-ravaged Maps, Incursion Temples, Beasts.

Fix: sidebar sizes to its longest name (11–18rem), headers nowrap, chosen icon items for those categories (any namespace), beasts use captured-beast art. Branch woke/market-sidebar-names.
