---
id: WOKEPOET-430
title: Show real drop sources for exceptional gems in Ctrl+Space search
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - search
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T03:14:51.068Z'
    comment: Created ticket.
    id: a-2026-11-21t03-14-51-068z
  - type: activity
    user: Agent
    date: '2026-11-21T03:24:41.685Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/699 open; adversarial
      review done and fixes applied; waiting on CI.
    id: a-2026-11-21t03-24-41-685z
  - type: comment
    user: Agent
    comment: >-
      Merged in https://github.com/guybnd/woke-poe-trade/pull/699 after
      adversarial review and green CI.
    date: '2026-11-21T03:34:16.170Z'
    completionComment: true
    id: c-2026-11-21t03-34-16-170z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T03:34:16.170Z'
  - type: comment
    user: Agent
    comment: >-
      Ctrl+Space gem cards now show drop sources for all 55 exceptional gems
      (poewiki-verified), Empower/Enhance/Enlighten, Portal, recipe-only and
      removed gems; regular Awakened say "no longer drops" with their
      replacement. Search only (PoB tooltip dropped to stay under startup JS
      budget).
    completionComment: true
    date: '2026-11-21T03:34:23.075Z'
    id: c-2026-11-21t03-34-23-075z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T03:34:23.731Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/699'
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
Ctrl+Space "spell echo" shows "Where to get Greater Spell Echo Support: Not in the campaign" (same for Awakened). Show where exceptional gems actually come from (Awakened: Maven/Sirus/Shaper etc., Enlighten/Empower/Enhance, Greater/exceptional supports from Heist/Sanctum etc.) in the search row sub and the gem card. Verified from poewiki, not memory.
