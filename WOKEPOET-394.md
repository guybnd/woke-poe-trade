---
id: WOKEPOET-394
title: 'Bug hunt team 3: shell, launcher, settings, modules'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:51:26.210Z'
    comment: Created ticket.
    id: a-2026-11-18t15-51-26-210z
  - type: comment
    user: Agent
    comment: >-
      3 bugs fixed in PR #629 (merged as 86a52185): dock icons dismissed Always,
      missing hotkeys on the Hotkeys page, Megalomaniac list reload. Tests,
      review and local checks passed.
    date: '2026-11-18T15:51:35.273Z'
    completionComment: true
    id: c-2026-11-18t15-51-35-273z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-18T15:51:35.273Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 86a52185. Fixed: PoB/Net worth dock icons dismissed Always can
      come back; tree and Net worth keys on the Hotkeys page with clash
      warnings; Megalomaniac notable list reloads. Open for Guy: Net worth tab
      filter shows all-tab totals; stash-optin test flakes under load.
    completionComment: true
    date: '2026-11-18T15:51:39.980Z'
    id: c-2026-11-18t15-51-39-980z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T15:51:40.450Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:56.097Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/629'
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
Bug hunt (team 3 of 3) over overlay shell, tools launcher, settings, updater, net worth, stacked decks, campaign, atlas, tree overlay, Megalomaniac and other modules.

Fixed (PR #629):
1. PoB and Net worth dock icons dismissed "Always" could never come back (missing from DOCK_ORDER).
2. Alt+T tree key and Net worth key missing from Settings > Hotkeys and clash warnings.
3. Megalomaniac notable list never reloaded after a failed read or data update.

Open: stash-optin.test.ts flakes under full-suite load; Net worth table rows with a tab filter show all-tab totals (design question for Guy).
