---
id: WOKEPOET-186
title: 'UI 6: dock icon glow pulses forever'
status: Done
priority: Low
effort: XS
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-169
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:27.743Z'
    comment: Created ticket.
    id: a-2026-11-10t02-56-27-743z
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:27.743Z'
    comment: Created as subtask of WOKEPOET-169.
    id: a-2026-11-10t02-56-27-743z
  - type: comment
    user: Agent
    comment: >-
      Should the dock icon glow be steady (my pick, per P15), pulse 3 times then
      go steady, or stay as an endless pulse?
    date: '2026-11-10T07:07:26.878Z'
    id: c-2026-11-10t07-07-26-878z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-10T07:07:26.878Z'
    comment: >-
      Should the dock icon glow be steady (my pick, per P15), pulse 3 times then
      go steady, or stay as an endless pulse?
  - type: comment
    user: Agent
    comment: 'Guy: glow while it''s running. Steady glow merged as #306.'
    date: '2026-11-10T09:07:49.466Z'
    id: c-2026-11-10t09-07-49-466z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-10T09:07:49.466Z'
    comment: 'Guy: glow while it''s running. Steady glow merged as #306.'
  - type: activity
    user: Agent
    date: '2026-11-10T09:07:51.467Z'
    comment: Updated description.
    id: a-2026-11-10t09-07-51-467z
  - type: status_change
    from: Grooming
    to: Todo
    user: Agent
    date: '2026-11-10T09:07:52.065Z'
  - type: comment
    user: Agent
    comment: 'Merged as #306 (e1bed0d5).'
    date: '2026-11-10T09:07:53.062Z'
    completionComment: true
    id: c-2026-11-10t09-07-53-062z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-10T09:07:53.062Z'
  - type: comment
    user: Agent
    comment: >-
      Merged #306, which makes the glow steady. No docs needed, because it's a
      CSS-only change.
    completionComment: true
    date: '2026-11-10T09:07:54.146Z'
    id: c-2026-11-10t09-07-54-146z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-10T09:07:54.487Z'
swimlane: null
needsAction: null
baselineCommit: e67d6ec4dad47efdb249e0afdf27705a03528309
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/306'
diffSummary:
  - file: renderer/src/web/woke/loot-filter/RuleBuilder.vue
    additions: 11
    deletions: 1
  - file: renderer/src/web/woke/loot-filter/rules.ts
    additions: 20
    deletions: 3
  - file: renderer/test/woke/filter-rules.test.ts
    additions: 12
    deletions: 1
---
> **TL;DR** The Stacked decks dock icon glows steadily while decks are being opened, instead of pulsing forever. Merged as #306.

Charter P15: nothing loops or pulses for attention. `renderer/src/web/woke/dock/DockIcon.vue` ran `dock-glow 1.6s infinite` on `.glow`; it is now the steady reduced-motion glow.
