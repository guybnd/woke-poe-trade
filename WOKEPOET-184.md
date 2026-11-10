---
id: WOKEPOET-184
title: 'UI 4: game art in place of generic icons'
status: Grooming
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
swimlane: require-input
needsAction: null
---
Charter P18. 159 different Font Awesome icons, 655 uses in `woke/`. Where the game has art, use it through `WIcon` / `game-icons.ts`: coins (14 uses), skull (8), gem (6), stopwatch (5), hammer (5), dungeon (5), map (3), flask (2). Keep Font Awesome only for UI actions (close, copy, search, settings, pin). Module icons in `modules.ts` without game art: Investments, Lab gems, Wealthy Exile, Session analytics, Death recap, Run timer, Challenge guide. Short mock of the swaps for Guy first.
