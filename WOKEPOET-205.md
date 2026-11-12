---
id: WOKEPOET-205
title: >-
  PoB tree: show socketed jewels and their effects (timeless, cluster, radius
  jewels)
status: Grooming
priority: None
effort: L
assignee: unassigned
tags:
  - feature
  - mocks
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-194
history:
  - type: activity
    user: Agent
    date: '2026-11-11T07:30:12.184Z'
    comment: Created ticket.
    id: a-2026-11-11t07-30-12-184z
  - type: activity
    user: Agent
    date: '2026-11-11T07:30:12.184Z'
    comment: Created as subtask of WOKEPOET-194.
    id: a-2026-11-11t07-30-12-184z
  - type: comment
    user: Agent
    comment: >-
      Mocks up, 2026-11-12: https://claude.ai/artifact/LjV41JaacDXq9eFeQtrtTH.
      Three questions: (1) a socketed jewel (A: art + tooltip, recommended; B:
      plus a jewel list), (2) radius and Timeless jewels (A: ring + changed
      nodes marked, recommended; B: ring only), (3) cluster jewels (A: draw the
      subtree; B: list the notables). Picks save in the page's db, at
      picks/current.
    date: '2026-11-12T06:41:39.427Z'
    selfAttested: true
    id: c-2026-11-12t06-41-39-427z
  - type: comment
    user: Agent
    comment: >-
      Part one shipped in 0.4.3 (#373): jewels in sockets with tooltips, PoB's
      radius rings, changed passives marked for Timeless and rewriting uniques,
      and jewel mods in totals. Part two is still to do: Timeless node rewrites
      (PoB lookup tables, zlib), cluster jewel subtrees (PoB cluster data),
      Thread of Hope's variable ring, Impossible Escape's keystone ring, and
      jewels inside cluster sockets.
    date: '2026-11-12T08:23:43.779Z'
    selfAttested: true
    id: c-2026-11-12t08-23-43-779z
  - type: activity
    user: Agent
    date: '2026-11-12T10:12:22.180Z'
    comment: >-
      Cluster jewels merged as #387 (c7ae20de). Timeless jewel rewrites in
      progress on claude/pob-timeless: main reads PoB's seed tables from the PoB
      install at runtime (quiet when missing), tooltips/totals/search show the
      rewritten passives.
    id: a-2026-11-12t10-12-22-180z
---
> TL;DR: Guy (2026-11-11): support and render every kind of jewel in the passive tree view, with their effects. Bigger work, later; mocks first.

Today: specs already carry `jewels` (socketed items, by socket), but the tree draws sockets empty and Totals ignore jewels.

Scope to groom:
- Draw the socketed jewel's art in its socket; hover shows the jewel tooltip.
- Radius jewels (Thread of Hope, Unnatural Instinct, Impossible Escape, Lioneye's Fall, Might of the Meek…): draw the radius ring and what they change on nodes in it.
- Timeless jewels (Elegant Hubris, Glorious Vanity, Lethal Pride, Brutal Restraint, Militant Faith, Heroic Tragedy): transformed node names and stats; needs PoB's timeless lookup tables (the A2 spike found these need zlib Inflate).
- Cluster jewels: their generated sub-trees (notables, small passives, sockets) drawn off the outer sockets; PoB's cluster data needed.
- Abyss/regular jewel mods counted in Totals as an option.
- Data source: PoB's TreeData and Data/TimelessJewelData, built by a script like build-tree-data.mjs; watch the bundle budgets (lazy data files, not JS).
