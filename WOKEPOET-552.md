---
id: WOKEPOET-552
title: Overlay stuck taking the game's clicks
status: Released
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-24T05:23:24.394Z'
    comment: Created ticket.
    id: a-2026-11-24t05-23-24-394z
  - type: comment
    user: Agent
    comment: >-
      Failsafe merged at 26c0e784; dev build reloaded onto it. The root cause is
      unconfirmed; the state log will show it if it recurs.
    completionComment: true
    date: '2026-11-24T05:23:29.476Z'
    id: c-2026-11-24t05-23-29-476z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T05:23:29.938Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:55.845Z'
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/852'
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
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
2026-11-24 ~04:15Z: the dev overlay blocked every click in the game, and Guy couldn't click anything. It wasn't reproduced and no merge was clearly at fault. Fixed defensively in https://github.com/guybnd/woke-poe-trade/pull/852 (26c0e784): a failsafe so the overlay never keeps the game's clicks, a rescue hotkey, and a state log for next time.

Side effect of the recovery: the old packaged build (PR 397) and the installed release (1.330.10) rewrote config.json, dropping 9 tool windows. Config was restored from the dev launcher backup. Full data backup: E:\Git\woke\backups\appdata-20261124-1517.
