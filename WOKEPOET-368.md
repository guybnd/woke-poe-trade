---
id: WOKEPOET-368
title: 'Price check: read the game''s other wordings of 3.30 stats (Goreblossom Blooms)'
status: Done
priority: High
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T04:55:43.569Z'
    comment: Created ticket.
    id: a-2026-11-18t04-55-43-569z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/601 (branch
      woke/goreblossom-blooms). 78 game wordings added from RePoE, Hindered/Stun
      sign fix, data v22. Review done, local checks pass; handed to coordinator
      for merge.
    date: '2026-11-18T05:05:00.486Z'
    completionComment: true
    id: c-2026-11-18t05-05-00-486z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-18T05:05:00.486Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as eefd37a8; data v22 live. 78 game wordings (Goreblossom Blooms
      plural, reduced/less, 100% forms) + Hindered/Stun sign fix; gameWordings
      step in trade-data-patch.
    completionComment: true
    date: '2026-11-18T05:15:45.932Z'
    id: c-2026-11-18t05-15-45-932z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T05:15:49.013Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/601'
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
Guy's price check showed "Goreblossom has +3(1-3) to maximum Blooms" as "Not recognized modifier". The trade site writes the stat "Goreblossom has +# maximum Bloom"; the game uses "+# to maximum Blooms" for 2 and up. Stats our 3.30 trade-data patch added knew only the trade wording, so plural, reduced/less and 100% wordings were unreadable.

Fix: trade-data-patch.mjs gets gameWordings (RePoE stat_translations.json, matched by trade id) as a `wordings` mode and a best-effort step in `apply`. 78 wordings added, data version bump.
