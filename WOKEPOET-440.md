---
id: WOKEPOET-440
title: 'Session window 6: switch over and retire the old two windows'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-434
history:
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:53.304Z'
    comment: Created ticket.
    id: a-2026-11-21t06-06-53-304z
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:53.304Z'
    comment: Created as subtask of WOKEPOET-434.
    id: a-2026-11-21t06-06-53-304z
  - type: comment
    user: Agent
    comment: >-
      Waiting on Guy (asked in the project thread 2026-11-21): (1) glance bar
      replaces the map toast or sits alongside (now alongside, off by default);
      (2) OK to point Session story's dock icon at the combined window on Map
      history, rename analytics to "Session" and remove the separate Session
      story panel? Default if no answer: keep both windows.
    date: '2026-11-21T08:04:25.524Z'
    id: c-2026-11-21t08-04-25-524z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-21T08:04:25.524Z'
    comment: >-
      Waiting on Guy (asked in the project thread 2026-11-21): (1) glance bar
      replaces the map toast or sits alongside (now alongside, off by default);
      (2) OK to point Session story's dock icon at the combined window on Map
      history, rename analytics to "Session" and remove the separate Session
      story panel? Default if no answer: keep both windows.
  - type: comment
    user: Agent
    comment: >-
      Guy 2026-11-21: Session story window can go; keep its dynamic dock icon,
      labelled Session analytics, opening the combined window. Keep both glance
      bar and toast.
    date: '2026-11-21T08:28:29.019Z'
    id: c-2026-11-21t08-28-29-019z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-21T08:28:29.019Z'
    comment: >-
      Guy 2026-11-21: Session story window can go; keep its dynamic dock icon,
      labelled Session analytics, opening the combined window. Keep both glance
      bar and toast.
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T08:28:29.155Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t08-28-29-155z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T08:28:29.155Z'
  - type: comment
    user: Agent
    comment: >-
      PR 716 merged (da7f365b): Session story window retired; dock icon "Session
      analytics" opens the combined window. CI green, review fixes applied.
    date: '2026-11-21T08:56:05.283Z'
    completionComment: true
    id: c-2026-11-21t08-56-05-283z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T08:56:05.283Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (da7f365b). Session story panel removed (menu::skip so it leaves
      the tab bar/Ctrl+Space tool list). Dock icon keeps its live card/peeks,
      titled Session analytics, wm-id = the placed analytics window (opens in
      game too); overlay click also jumps to Map history; menu: Map history, All
      nights; toast if the analytics module is off. Related fixes this session:
      glance seconds (PR 715), tonight survives restarts (PR 718). Release notes
      added.
    completionComment: true
    date: '2026-11-21T08:56:07.580Z'
    id: c-2026-11-21t08-56-07-580z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T08:56:08.047Z'
swimlane: null
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/716'
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
Point dock, settings and toasts at the new window; remove Session analytics and Session story widgets; migrate their saved config. Release note line.
