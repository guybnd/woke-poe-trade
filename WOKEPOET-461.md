---
id: WOKEPOET-461
title: Check for updates button (Settings > Install & updates) + Ctrl+Space command
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T14:30:24.698Z'
    comment: Created ticket.
    id: a-2026-11-21t14-30-24-698z
  - type: activity
    user: Agent
    date: '2026-11-21T14:37:09.629Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/742 open; adversarial
      review and CI running.
    id: a-2026-11-21t14-37-09-629z
  - type: activity
    user: Agent
    date: '2026-11-21T14:40:25.476Z'
    comment: >-
      Review fixes pushed (f4403520): fake host registers update-check for e2e,
      skipped-version and rollback-held results, neutral updater error text,
      dead toast branch removed.
    id: a-2026-11-21t14-40-25-476z
  - type: comment
    user: Agent
    comment: >-
      Merged as https://github.com/guybnd/woke-poe-trade/pull/742 (cb29325f).
      Review findings fixed, all CI green.
    date: '2026-11-21T14:59:06.734Z'
    completionComment: true
    id: c-2026-11-21t14-59-06-734z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T14:59:06.735Z'
  - type: comment
    user: Agent
    comment: >-
      Check for updates row + Ctrl+Space command shipped in PR 742 (cb29325f).
      Installed builds map electron-updater state; portable/dev check GitHub
      releases/latest with a release-page link. Unit + e2e tests, review fixes,
      CI green.
    completionComment: true
    date: '2026-11-21T14:59:12.704Z'
    id: c-2026-11-21t14-59-12-704z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T14:59:13.400Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/742'
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
Add a "Check for updates" button next to the Version row on the Install page, and a matching Ctrl+Space search command.

- Auto-update builds: trigger electron-updater check, show inline status.
- Portable/dev: query GitHub releases latest, compare to app version, show Up to date / vX available + Download link.
- Unit tests for version compare and result mapping; e2e if patterns exist.
