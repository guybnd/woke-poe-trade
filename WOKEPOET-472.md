---
id: WOKEPOET-472
title: 'Ctrl+Space: "Forbidden Reliquary" finds nothing'
status: Released
priority: Medium
effort: XS
assignee: unassigned
tags:
  - search
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-22T06:28:09.690Z'
    comment: Created ticket.
    id: a-2026-11-22t06-28-09-690z
  - type: comment
    user: Agent
    comment: PR 754 merged after review and green CI.
    date: '2026-11-22T06:34:14.926Z'
    completionComment: true
    id: c-2026-11-22t06-34-14-926z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T06:34:14.926Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 754: "forbidden reliquary"/"reliquary" (6+ letters) opens the
      Templar Vaults card with a note to search the item on the label. Not a
      data gap: the card inside (A Stone Perfected) was already in item data and
      priced.
    completionComment: true
    date: '2026-11-22T06:34:19.338Z'
    id: c-2026-11-22t06-34-19-338z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T06:34:19.825Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:54.895Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/754'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
Guy searched "forbidden re" in Ctrl+Space while hovering a vault display case; only web fallbacks came back.

Cause: "Forbidden Reliquary" is the in-game label of the vault display case (poewiki Templar Vault pages), not an item. The item it held (A Stone Perfected, div card) is in item data and priced (16.58c Covens). The vault lookup only matched "vault" or vault names.

Fix: "forbidden reliquary"/"reliquary" (6+ letters) opens the Templar Vaults card, with a line saying to search the item on the label.
