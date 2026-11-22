---
id: WOKEPOET-486
title: 'Price check: rarity chip (Any/Magic/Rare) for gear, to hunt magic bases'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T22:56:07.904Z'
    comment: Created ticket.
    id: a-2026-11-22t22-56-07-904z
  - type: comment
    user: Agent
    comment: >-
      Merged as PR 773 (all checks green, adversarial review done). It adds the
      rarity chip (Any / Magic / Rare) on gear and jewels.
    date: '2026-11-22T23:25:27.226Z'
    completionComment: true
    id: c-2026-11-22t23-25-27-226z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T23:25:27.226Z'
  - type: comment
    user: Agent
    comment: >-
      Rarity chip (Any / Magic / Rare) beside Corrupted on non-unique armour,
      weapons, jewellery, quivers and jewels (Guy's pick A). Amber warning when
      Magic plus more than one prefix/suffix row is ticked. The chip loads on
      demand, which keeps startup JS at 1638.7 of 1640 KB. All CI checks are
      green.
    completionComment: true
    date: '2026-11-22T23:25:30.660Z'
    id: c-2026-11-22t23-25-30-660z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T23:25:31.325Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/773'
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
Discord request: price check a rare base (e.g. Necrotic Armour ilvl 86, life + suppress) but list magic items only, for recombining/fracturing. Today only magic jewels get a Magic chip. Mockups: https://claude.ai/artifact/3tnPzMQdFnrsa3b8ALrhjZ (A recommended: cycle chip; B simpler: Magic toggle). Branch woke/magic-bases.
