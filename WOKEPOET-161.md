---
id: WOKEPOET-161
title: Stacked deck tracker
status: Done
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
  - type: activity
    user: Agent
    date: '2026-11-08T16:36:31.452Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/276 opened (branch
      claude/stacked-deck-tracker). D2 allowed: PL sheet is public view-only
      with no terms; weights bundled with credit. Local typecheck/lint/vitest
      pass; adversarial review and full e2e running.
    id: a-2026-11-08t16-36-31-452z
  - type: activity
    user: Agent
    date: '2026-11-08T16:36:31.995Z'
    comment: Updated implementation link.
    id: a-2026-11-08t16-36-31-995z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/276 ready to merge once
      GitHub CI is green (it was still running at handoff). Built: A1 dock icon
      (shows only while a session runs, glows while opening, New session, opens
      the window), A3+C2 big-hit popup with an optional chime, B1 card table,
      result, without-top-card result and running chart, Stacked decks tab in
      Session analytics, C1 open-or-sell chip on price check, D1 own average per
      deck, D2 Prohibited Library 3.29 weights bundled with credit, C3 expected
      value and luck percentile. Adversarial review found 9 issues, all fixed.
      Local: tsc, lint, vitest 2782 pass, stacked-decks e2e 3/3. The only
      full-suite failure (tab-rail) also fails on master.
    date: '2026-11-08T16:49:02.353Z'
    completionComment: true
    id: c-2026-11-08t16-49-02-353z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-08T16:49:02.353Z'
  - type: comment
    user: Agent
    comment: 'Squash-merged to master as c76b889, with CI green.'
    completionComment: true
    date: '2026-11-08T17:14:57.415Z'
    id: c-2026-11-08t17-14-57-415z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-08T17:14:57.646Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/276'
baselineCommit: e67d6ec4dad47efdb249e0afdf27705a03528309
swimlane: null
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
