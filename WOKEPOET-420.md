---
id: WOKEPOET-420
title: 'Price check: roll quality on unique mod lines + high-roll chip'
status: Ready
priority: Medium
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T14:37:14.189Z'
    comment: Created ticket.
    id: a-2026-11-20t14-37-14-189z
  - type: activity
    user: Agent
    date: '2026-11-20T14:43:59.926Z'
    comment: >-
      Guy picked C (Alt-style ranges in the line). d889061b on
      woke/unique-roll-quality, on the dev build; review fixes in (chip skips
      hidden rows and mods already in a total). Cloud checks running.
    id: a-2026-11-20t14-43-59-926z
  - type: activity
    user: Agent
    date: '2026-11-20T14:54:06.768Z'
    comment: Updated implementation link.
    id: a-2026-11-20t14-54-06-768z
  - type: comment
    user: Agent
    comment: >-
      PR #684 green, review fixes in, Guy OK'd on dev build (pick C). Startup JS
      budget 1640->1642 KB flagged to Guy. Sent to the merge thread.
    date: '2026-11-20T15:27:20.500Z'
    completionComment: true
    id: c-2026-11-20t15-27-20-500z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T15:27:20.501Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/684'
needsAction: null
---
Guy (2026-11-20, Bino's Kitchen Knife): show how high each unique mod rolled in its range, and flag when the copy is a high roll worth a real trade search (poe.ninja prices an average copy).

Mocks + picks: https://claude.ai/artifact/2daL3ixRkvuTrUr85nUNhN (A recommended: roll % in the tier gutter, gold ≥ 90%; chip "High roll N%" on the name row when ≥2 rolling lines average ≥ 75%; chip click = one trade search for these rolls).

Branch: woke/unique-roll-quality (worktree E:\Git\woke\wt\unique-roll).
