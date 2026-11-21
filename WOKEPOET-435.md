---
id: WOKEPOET-435
title: 'Session window 1: one window shell with tonight''s strip on top and the tabs'
status: Done
priority: None
effort: M
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-434
history:
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:44.607Z'
    comment: Created ticket.
    id: a-2026-11-21t06-06-44-607z
  - type: activity
    user: Agent
    date: '2026-11-21T06:06:44.607Z'
    comment: Created as subtask of WOKEPOET-434.
    id: a-2026-11-21t06-06-44-607z
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-21T06:07:07.904Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-21t06-07-07-904z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-21T06:07:07.904Z'
  - type: activity
    user: Agent
    date: '2026-11-21T06:10:25.234Z'
    comment: >-
      Branch session-window-shell (worktree E:\Git\woke\wt\session-window):
      NightCard band in Session analytics' banner slot, Map history first tab,
      nights logic extracted to session-story/nights.ts. CI check and
      adversarial review running.
    id: a-2026-11-21t06-10-25-234z
  - type: activity
    user: Agent
    date: '2026-11-21T06:19:56.663Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/705. First CI run:
      trade.spec e2e failed (fixed: test clicks Strategies) and startup JS
      1640.1 KB vs budget 1640 (master sits at exactly 1640). Fix: new
      session-story/TonightBand.vue, loaded by analytics with
      defineAsyncComponent so it stays in Session story's chunk and adds no
      shared chunk to the index preload lists. Re-running CI.
    id: a-2026-11-21t06-19-56-663z
  - type: comment
    user: Agent
    comment: >-
      PR 705 merged (c5fb94b5): tonight's card on top of Session analytics, Map
      history first. CI green, two adversarial reviews addressed.
    date: '2026-11-21T06:56:42.345Z'
    completionComment: true
    id: c-2026-11-21t06-56-42-345z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T06:56:42.345Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (c5fb94b5). Session analytics shows tonight's card
      (session-story/TonightBand.vue, re-exported from WidgetSessionStory.vue
      and loaded via import() of that chunk to keep startup JS at 1640 KB) above
      the tabs; Map history is the first tab when Session story is on and mounts
      only while the window is open. Nights logic in session-story/nights.ts.
      Release note added; no other docs needed. Left for later steps: dock
      icon/map toast opening this window, live current-map line.
    completionComment: true
    date: '2026-11-21T06:56:46.118Z'
    id: c-2026-11-21t06-56-46-118z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T06:56:46.675Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/705'
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
New Session window: live band (current map, timer, profit) + NightCard strip and totals on top; tabs Tonight / Nights / Maps / Strategies / Decks reuse the existing analytics tab bodies. Dock icon and map toast open it at Tonight. Old windows untouched.
