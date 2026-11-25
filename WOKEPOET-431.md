---
id: WOKEPOET-431
title: Vault rewards and value in Ctrl+Space and the Nightmare check
status: Released
priority: Medium
effort: M
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T03:33:56.686Z'
    comment: Created ticket.
    id: a-2026-11-21t03-33-56-686z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T03:33:59.810Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t03-33-59-810z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T03:33:59.810Z'
  - type: activity
    user: Agent
    date: '2026-11-21T03:45:54.671Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/701 open; adversarial
      review running. Guy corrected the mechanic: Nightmare maps spawn their
      boss's quadrant vault ~54% (107/198 in his Client.txt). Mockups/picks:
      https://claude.ai/artifact/JRyG3cdwwonZFeuM6Lys6s
    id: a-2026-11-21t03-45-54-671z
  - type: activity
    user: Event Horizon
    date: '2026-11-21T04:04:03.230Z'
    comment: Claim by claude-code@guy-pc expired (no heartbeat for 30 min)
    id: a-2026-11-21t04-04-03-230z
  - type: status_change
    from: In Progress
    to: Todo
    user: Event Horizon
    date: '2026-11-21T04:04:03.309Z'
  - type: comment
    user: Agent
    comment: 'PR 701 reviewed (two adversarial passes), CI green, merged as 324f32ed.'
    date: '2026-11-21T04:15:40.130Z'
    completionComment: true
    id: c-2026-11-21t04-15-40-130z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-21T04:15:40.130Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (324f32ed), dev build reloaded. Ctrl+Space "vault": one card with
      all four vaults' rewards at poe.ninja prices and an estimated typical
      pick. Nightmare strip: vault tag per map, Vault row, Vaults tab in the big
      view (tag only, not in profit; asked Guy whether to count it). Vault data
      via npm run vault-data as live data; league checklist step added. Rate:
      54% of Nightmare maps (107/198, Guy's Client.txt).
    completionComment: true
    date: '2026-11-21T04:15:51.796Z'
    id: c-2026-11-21t04-15-51-796z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T04:15:52.320Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:42.555Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/701'
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
The four 3.30 Templar Vaults (Zealot's, Scholar's, Arkhon's, Machinist's): each one's reward pool from poewiki, priced live from poe.ninja, with a ~typical-pick estimate (no weights or spawn chance are published).

- Ctrl+Space: "vault" lists the overview and each vault; vault names find their card.
- Nightmare map check: each map tagged with the vault its favoured fragments' pinnacle fight leads to (not added to profit); Arkhon's Vault also gives Nightmare Maps.
- League update: data file + league-migration checklist step.

Mockups: https://claude.ai/artifact/JRyG3cdwwonZFeuM6Lys6s
Open: whether uber pinnacle kills spawn vaults (wiki silent).
