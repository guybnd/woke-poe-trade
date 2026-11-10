---
id: WOKEPOET-184
title: 'UI 4: game art in place of generic icons'
status: Done
priority: Medium
effort: M
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-169
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:22.121Z'
    comment: Created ticket.
    id: a-2026-11-10t02-56-22-121z
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:22.121Z'
    comment: Created as subtask of WOKEPOET-169.
    id: a-2026-11-10t02-56-22-121z
  - type: comment
    user: Agent
    comment: >-
      **Which game art should replace the generic icons?** Mock:
      https://claude.ai/artifact/4cvYuxsmteYZB46m98jBZd. My picks are:

      - Lab gems: Gemcutter's Prism

      - Death recap: Portal Scroll

      - Investments: Exalted Orb

      - Wealthy Exile: Mirror of Kalandra

      - Session analytics: Stacked Deck

      - Challenge guide: Sacred Orb

      - Run timer: keep the stopwatch (the game has no art for time)

      - Disenchant: dust art


      Default if there's no answer: all picks.
    date: '2026-11-10T06:12:07.608Z'
    id: c-2026-11-10t06-12-07-608z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-10T06:12:07.608Z'
    comment: >-
      **Which game art should replace the generic icons?** Mock:
      https://claude.ai/artifact/4cvYuxsmteYZB46m98jBZd. My picks are:

      - Lab gems: Gemcutter's Prism

      - Death recap: Portal Scroll

      - Investments: Exalted Orb

      - Wealthy Exile: Mirror of Kalandra

      - Session analytics: Stacked Deck

      - Challenge guide: Sacred Orb

      - Run timer: keep the stopwatch (the game has no art for time)

      - Disenchant: dust art


      Default if there's no answer: all picks.
  - type: activity
    user: Agent
    date: '2026-11-10T07:05:45.172Z'
    comment: Updated description.
    id: a-2026-11-10t07-05-45-172z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-10T07:05:45.772Z'
  - type: status_change
    from: Grooming
    to: Todo
    user: Agent
    date: '2026-11-10T07:05:45.772Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as #304 (10522f9). The picks are in modules.ts, with art in
      public/images/art. The panel headers use moduleIcon().
    date: '2026-11-10T07:05:47.053Z'
    completionComment: true
    id: c-2026-11-10t07-05-47-053z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-10T07:05:47.053Z'
  - type: comment
    user: Agent
    comment: >-
      Merged #304. Docs: no README change needed beyond the ModuleIcon src
      comment in modules.ts.
    completionComment: true
    date: '2026-11-10T07:05:48.192Z'
    id: c-2026-11-10t07-05-48-192z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-10T07:05:49.508Z'
swimlane: null
needsAction: null
baselineCommit: e67d6ec4dad47efdb249e0afdf27705a03528309
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/304'
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
> **TL;DR** Game art in place of generic module icons, from Guy's picks on https://claude.ai/artifact/4cvYuxsmteYZB46m98jBZd. Merged as #304.

Charter P18. 159 different Font Awesome icons, 655 uses in `woke/`. Where the game has art, use it through `WIcon` / `game-icons.ts`. Keep Font Awesome only for UI actions (close, copy, search, settings, pin).

## Acceptance criteria
- [x] Module icons without game art get Guy's picks (heist rewards and quest items ship in `public/images/art`).
- [x] Modules no longer share one piece of art except where Guy kept it.
- [x] Dock, tab bar, Settings and panel headers show the same art.
