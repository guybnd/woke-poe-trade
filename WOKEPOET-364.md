---
id: WOKEPOET-364
title: >-
  Saved lists, step 2: Atlas and PoB on the shared list; folders and drag for
  Regex and Trade
status: In Progress
priority: None
effort: L
assignee: unassigned
tags:
  - cleanup
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-354
history:
  - type: activity
    user: Agent
    date: '2026-11-17T12:08:49.115Z'
    comment: Created ticket.
    id: a-2026-11-17t12-08-49-115z
  - type: activity
    user: Agent
    date: '2026-11-17T12:08:49.115Z'
    comment: Created as subtask of WOKEPOET-354.
    id: a-2026-11-17t12-08-49-115z
  - type: activity
    user: Agent
    date: '2026-11-17T12:43:23.944Z'
    comment: >-
      Parity 1/4 up: PR #587 (woke/saved-tree-atlas) — shared/saved-tree,
      use-saved-tree, SavedTree.vue; Atlas on it; parity e2e. Next: Regex
      library, Trade searches, PoB builds (order kept in widget config, Guy's
      pick).
    id: a-2026-11-17t12-43-23-944z
  - type: activity
    user: Agent
    date: '2026-11-17T13:12:44.163Z'
    comment: >-
      #587 merged (Atlas on shared tree). Parity 2/4 up: PR #590
      (woke/saved-tree-regex-2), Regex library on the shared tree; locked
      Atlas/PoB folders. Next: Trade searches, PoB builds.
    id: a-2026-11-17t13-12-44-163z
---
> **TL;DR:** Guy picked the follow-up to #585: Atlas strategies and PoB builds use the shared saved-list parts (row keys, rename in place, remove with Undo), and Regex library and Trade searches get nested folders and drag reorder, lifted from Atlas into shared code.

Keep each list's current behaviour; PoB keeps its files-on-disk data source. Characterization tests first; one or two PRs.
