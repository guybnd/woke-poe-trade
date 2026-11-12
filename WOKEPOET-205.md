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
