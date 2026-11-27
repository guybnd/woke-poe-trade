---
id: WOKEPOET-366
title: 'Price check: pick another cluster jewel type'
status: Released
priority: Medium
effort: S
assignee: Agent
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-18T04:08:42.928Z'
    comment: Created ticket.
    id: a-2026-11-18t04-08-42-928z
  - type: comment
    user: Agent
    comment: >-
      Mocks A/B/C posted for Guy's pick:
      https://claude.ai/artifact/RF9U9wYhr2cqeNgznmDT69 (A recommended: type
      chip in header).
    date: '2026-11-18T04:10:52.042Z'
    selfAttested: true
    id: c-2026-11-18t04-10-52-042z
  - type: activity
    user: Agent
    date: '2026-11-18T04:35:12.784Z'
    comment: >-
      Built C on branch woke/cluster-type (59ac354d): title picker with size
      tabs + type-to-filter, review fixes in. Checks green (lint, tsc, 4434
      unit, build, e2e). Handed to coordinator for merge.
    id: a-2026-11-18t04-35-12-784z
  - type: comment
    user: Agent
    comment: 'Type picker (Guy''s pick C + typing) merged in #600 (09865d0a).'
    date: '2026-11-18T05:05:10.035Z'
    completionComment: true
    id: c-2026-11-18t05-05-10-035z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T05:05:10.035Z'
  - type: comment
    user: Agent
    comment: >-
      Merged in #600 (09865d0a): a cluster jewel's price check title picks size
      (Small/Medium/Large tabs) and type, with typing to filter. Pick rewrites
      base, enchant, passive min, unticks notables; picking own restores; never
      searches until Search.
    completionComment: true
    date: '2026-11-18T05:05:13.968Z'
    id: c-2026-11-18t05-05-13-968z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T05:05:14.434Z'
  - type: activity
    user: Agent
    date: '2026-11-18T05:17:12.134Z'
    comment: >-
      Follow-up fix from Guy: another size now searches its whole passive count
      range (Small 2-3, Medium 4-6, Large 8-12). Branch woke/cluster-passives
      a67bbda5, handed to coordinator for merge.
    id: a-2026-11-18t05-17-12-134z
  - type: activity
    user: Agent
    date: '2026-11-18T05:33:49.252Z'
    comment: >-
      Passive range follow-up merged:
      https://github.com/guybnd/woke-poe-trade/pull/602 (832efb9a). Another size
      searches its whole passive range; Yours keeps the copy's count.
    id: a-2026-11-18t05-33-49-252z
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:31:03.194Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/600'
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
> **TL;DR:** On a cluster jewel price check, a dropdown swaps the enchant type (e.g. Attack Damage while Dual Wielding → Spell Damage) so Guy can price a different cluster of the same size. Mocks first, Guy picks.

- Options per size come from the cluster data in `public/data/tree/passive-tree.json` (17 Large, 21 Medium, 17 Small).
- Enchant trade id is `enchant.stat_3948993189|<n>` per type.
- Notables tied to the old type get unticked when the type changes.
- No search runs until Search is pressed.
