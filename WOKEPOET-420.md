---
id: WOKEPOET-420
title: 'Price check: roll quality on unique mod lines + high-roll chip'
status: Released
priority: Medium
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-20T14:37:14.189Z'
    comment: Created ticket.
    id: a-2026-11-20t14-37-14-189z
  - type: activity
    user: Agent
    date: '2026-11-20T14:43:59.926Z'
    comment: >-
      Guy picked C (Alt-style ranges in the line). d889061b on
      woke/unique-roll-quality, on the dev build; review fixes in (chip skips
      hidden rows and mods already in a total). Cloud checks running.
    id: a-2026-11-20t14-43-59-926z
  - type: activity
    user: Agent
    date: '2026-11-20T14:54:06.768Z'
    comment: Updated implementation link.
    id: a-2026-11-20t14-54-06-768z
  - type: comment
    user: Agent
    comment: >-
      PR #684 green, review fixes in, Guy OK'd on dev build (pick C). Startup JS
      budget 1640->1642 KB flagged to Guy. Sent to the merge thread.
    date: '2026-11-20T15:27:20.500Z'
    completionComment: true
    id: c-2026-11-20t15-27-20-500z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T15:27:20.501Z'
  - type: comment
    user: Agent
    comment: >-
      Merged #684 (11fe2f06): unique lines in PoE mode show Alt-style ranges per
      number, gold when ≥90% up the range (Guy's pick C); High roll N% chip when
      ≥2 rolling lines average ≥75%, click = one trade search. Startup JS kept
      under 1640 KB by lazy-loading anointment and cluster spot tags.
    completionComment: true
    date: '2026-11-20T15:33:37.163Z'
    id: c-2026-11-20t15-33-37-163z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T15:33:37.715Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:45.415Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/684'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
Guy (2026-11-20, Bino's Kitchen Knife): show how high each unique mod rolled in its range, and flag when the copy is a high roll worth a real trade search (poe.ninja prices an average copy).

Mocks + picks: https://claude.ai/artifact/2daL3ixRkvuTrUr85nUNhN (A recommended: roll % in the tier gutter, gold ≥ 90%; chip "High roll N%" on the name row when ≥2 rolling lines average ≥ 75%; chip click = one trade search for these rolls).

Branch: woke/unique-roll-quality (worktree E:\Git\woke\wt\unique-roll).
