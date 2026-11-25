---
id: WOKEPOET-463
title: >-
  Glance bar drag handle: show only while Settings is open, not over trade
  search
status: Released
priority: Medium
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T14:42:41.432Z'
    comment: Created ticket.
    id: a-2026-11-21t14-42-41-432z
  - type: activity
    user: Agent
    date: '2026-11-21T14:45:35.805Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/744 open: gate is
      wm.active && Settings shown. CI + adversarial review running.
    id: a-2026-11-21t14-45-35-805z
  - type: comment
    user: Agent
    comment: >-
      PR #744 merged (77bee1da): glance bar handle only while Settings is open.
      CI green, adversarial review fixes applied.
    date: '2026-11-21T15:26:23.853Z'
    completionComment: true
    id: c-2026-11-21t15-26-23-853z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T15:26:23.853Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 77bee1da. Glance bar takes the mouse and shows its drag handle
      only while Settings is open (wm.active && settings window wmWants 'show'),
      no longer whenever the overlay is open. After-map toast / big-hit popup
      don't share that gate, unchanged. Fake-game spec glance-bar.spec.ts covers
      price check + overlay (hidden) and Settings (shown).
    completionComment: true
    date: '2026-11-21T15:26:27.363Z'
    id: c-2026-11-21t15-26-27-363z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T15:26:27.967Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:55.962Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/744'
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
Guy: "glance bar handle shouldnt appear while trade search is up... just when in settings". The glance bar's drag handle (grip + "Glance bar | Tonight N maps") shows over the price check / trade window whenever the overlay is open. Gate it on Settings being open instead. Check after-map toast / big-hit popup handles for the same gate.
