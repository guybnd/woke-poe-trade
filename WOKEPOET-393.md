---
id: WOKEPOET-393
title: >-
  Price check mod menu extras: next tier up, all tiers, always/never tick,
  Alt+Click exclude
status: Released
priority: Medium
effort: M
assignee: Agent
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:39:45.779Z'
    comment: Created ticket.
    id: a-2026-11-18t15-39-45-779z
  - type: comment
    user: Agent
    comment: >-
      Merged as PR #637 (5ed80278): next tier up, all tiers, always/never tick,
      Alt+Click exclude.
    date: '2026-11-18T15:53:01.817Z'
    completionComment: true
    id: c-2026-11-18t15-53-01-817z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T15:53:01.817Z'
  - type: comment
    user: Agent
    comment: 'Merged as #637 (5ed80278).'
    completionComment: true
    date: '2026-11-18T15:53:02.620Z'
    id: c-2026-11-18t15-53-02-620z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T15:53:02.921Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:55.983Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/637'
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
Guy's extra picks from the mod menu mocks (https://claude.ai/artifact/A23iFZEDZdvc8MKFY6hVPt, picks/current, 2026-11-18), on top of #628.

Branch `woke/menu-tier-picks` (b7494886, on master 9e9f2ab0):
- Min: Next tier up (Tn, value) and All tiers… (second menu; a click sets min/max to that tier's worst roll), from public/data/mod-tiers.json; shown only when the data's tier matches the item's own
- Always tick this / Never tick this, saved in price-check config `wokeTickPrefs`, applied to new price checks (not bulk, not inTotal/hidden rows)
- Alt + Click a tick box = Exclude it
Review: 8 findings, 7 fixed (catalysed jewellery gets no tier lines, safe).
