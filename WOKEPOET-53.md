---
id: WOKEPOET-53
title: 'Updates: prompt when the game is closed, rollback, signing, log errors'
status: Done
priority: Medium
effort: L
assignee: unassigned
tags:
  - feature
  - overlay-core
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-36
history:
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:00.136Z'
    comment: Created ticket.
    id: a-2026-11-05t08-10-00-136z
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:00.136Z'
    comment: Created as subtask of WOKEPOET-36.
    id: a-2026-11-05t08-10-00-136z
  - type: comment
    user: Agent
    comment: >-
      Update error logging merged in #150. Still open: prompting when the game
      is closed, rollback, and signing (Guy's decision, since it costs money).
    date: '2026-11-05T11:08:35.574Z'
    selfAttested: true
    id: c-2026-11-05t11-08-35-574z
  - type: comment
    user: Agent
    comment: >-
      From the project review (WOKEPOET-168, finding B3): no signing secrets are
      set on the repo (`WIN_CSC_LINK` is empty), so the installer and
      auto-updates are unsigned and SmartScreen warns. Decision for Guy: buy
      signing (Azure Trusted Signing is the cheap route) or say on the download
      page that the warning is expected.
    date: '2026-11-10T02:56:31.237Z'
    selfAttested: true
    id: c-2026-11-10t02-56-31-237z
  - type: comment
    user: Agent
    comment: >-
      Guy 2026-11-13: not buying code signing. Instead the download page
      (README, landing page or release notes, wherever players download) gets
      one line on SmartScreen: "More info > Run anyway". Signing decision
      closed. Still open here: prompting while the game is closed, and rollback.
    date: '2026-11-13T03:02:28.376Z'
    selfAttested: true
    pin: true
    id: c-2026-11-13t03-02-28-376z
  - type: activity
    user: Agent
    date: '2026-11-18T07:25:27.880Z'
    comment: >-
      Built on woke/safer-updates (c6aa8fee, pushed): error logs, install while
      the game is closed, Guy's picks E (notice) and A+B (Go back in About +
      tray). Four adversarial reviews, all fixed; local checks pass. Untried in
      a real packaged install (downgrade, GitHub download, notices, tray).
      Handed to coordinator. Code signing out of scope.
    id: a-2026-11-18t07-25-27-880z
  - type: activity
    user: Agent
    date: '2026-11-18T07:26:22.048Z'
    comment: >-
      Guy picked "ship it visible, test after" (2026-11-18). OPEN: a real Go
      back test from 1.330.10 to 1.330.9 on Guy's install (while not playing) —
      checks the downgrade install, GitHub download + hash check, skip rule,
      tray item and About rows. Also untried live: automatic install while the
      game is closed and the "Updated to X" notice.
    pin: true
    id: a-2026-11-18t07-26-22-048z
  - type: comment
    user: Agent
    comment: >-
      Merged as #612 (209a831b): full update error logs, install while the game
      is closed, "Updated to X" notice, Go back in About + tray. Still open: a
      real Go back test (1.330.10 → 1.330.9) after v1.330.10 ships. Code signing
      stays out of scope (Guy's call).
    date: '2026-11-18T07:40:00.138Z'
    completionComment: true
    id: c-2026-11-18t07-40-00-138z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T07:40:00.138Z'
  - type: comment
    user: Agent
    comment: >-
      Merged #612. Open after release: Guy tries Go back from 1.330.10 to
      1.330.9 once on his install (pinned note above).
    completionComment: true
    date: '2026-11-18T07:40:06.512Z'
    id: c-2026-11-18t07-40-06-512z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T07:40:06.998Z'
subtasks:
  - WOKEPOET-260
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/612'
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
> **TL;DR** C8. Update timing is fine, but there's no way back from a bad release, no code signing, update errors aren't logged (AppUpdater.ts), and it installs only on quit, which tray apps rarely do. Signing costs money, so that part is Guy's decision. Consider replacing the PowerShell call in runningGameLog, which antivirus tools dislike. Logging the error is an easy first step.
