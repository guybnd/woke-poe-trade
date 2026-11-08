---
id: WOKEPOET-161
title: Stacked deck tracker
status: In Progress
priority: Medium
effort: L
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-08T16:12:06.508Z'
    comment: Created ticket.
    id: a-2026-11-08t16-12-06-508z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-08T16:12:10.981Z'
needsAction: null
---
Stacked Deck tracker module. Guy's picks from mockup https://claude.ai/artifact/N4HKYnpmThD6DB3bQQ5atB : A1 + A3, B1, C1 + C2 + C3, D1 + D2.

Idea inspired by navali-creations/soothsayer (AGPL-3.0) — no code copied or ported; written from scratch.

- Source: Client.txt `Card drawn from the deck: <divination>{Card}` via shared game-log stream.
- A1 dock hover icon: live session (Opened, Spent, Got, Result, card table), glow while opening, New session, Open in window. 15 min idle ends session.
- A3 + C2: big-hit popup + optional sound above threshold (default 1 div, sound off).
- B1: cards by total value, Result, Without top card, running result chart.
- History next to Session analytics records, "Stacked decks" tab.
- C1: Open or sell verdict on Stacked Deck price check.
- C3: luck vs expected, percentile (needs D2).
- D1: EV from own history. D2: Prohibited Library weights snapshot with credit (check sheet terms first).
- Tests + fake-game e2e.
