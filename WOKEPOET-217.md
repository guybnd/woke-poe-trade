---
id: WOKEPOET-217
title: 'Ctrl+Space: more lookups (Guy''s picks)'
status: Done
priority: Medium
effort: L
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T10:37:43.421Z'
    comment: Created ticket.
    id: a-2026-11-12t10-37-43-421z
  - type: activity
    user: Agent
    date: '2026-11-12T11:04:15.832Z'
    comment: >-
      Merged #395 (currency maths, countdowns, web search) as 971204d3. #397
      (boss cards, where it drops) up for merge. Next: div card set value,
      recipes, gems, tree, Betrayal, "?" card.
    id: a-2026-11-12t11-04-15-832z
  - type: comment
    user: Agent
    comment: >-
      All picks merged: #395, #397, #398, #399, #401 (adversarially reviewed,
      local checks pass). Maybes (zone card, pantheon, saved stuff) left for
      Guy.
    date: '2026-11-12T11:49:53.152Z'
    completionComment: true
    id: c-2026-11-12t11-49-53-152z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-12T11:49:53.152Z'
  - type: comment
    user: Agent
    comment: >-
      All 10 of Guy's yes picks are merged, plus the "?" examples card: #395,
      #397, #398, #399, #401. Each had an adversarial review, and its fixes are
      in. Guy's maybes (zone card, pantheon, your saved stuff) are still
      undecided.
    completionComment: true
    date: '2026-11-12T11:49:58.198Z'
    id: c-2026-11-12t11-49-58-198z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T11:49:58.501Z'
needsAction: null
baselineCommit: 4cf5d0ff7c5caef33fd34897ba841c262fe72169
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/401'
swimlane: null
diffSummary:
  - file: scripts/upstream-data.mjs
    additions: 21
    deletions: 1
---
> **TL;DR:** Ctrl+Space search learns new lookups Guy picked on 2026-11-12, plus a "?" card with examples at the end.

Picker: https://claude.ai/artifact/XbwZfo1kkaYHYD1sFzpTZG

**Yes:** currency maths, web search fallback, lab reset/league end countdowns, where an item drops, boss cards, where to get a gem, div card set value, vendor recipes, passive tree lookup, Betrayal members.
**Maybe:** zone card, pantheon, your saved stuff.
**No:** chat commands, map mod lookup, mod/stat lookup, socket colour maths. Map lookup unpicked.
**Plus:** a "?" info card in the search with examples from these, to inspire players. Last.

Work in clone E:\Git\woke-search-lookups. One PR per group; review + local checks; merge.
