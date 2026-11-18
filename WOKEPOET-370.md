---
id: WOKEPOET-370
title: 'Alt+F unique list + tier tooltip: mark drop-restricted uniques'
status: Ready
priority: Medium
effort: None
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T07:37:17.317Z'
    comment: Created ticket.
    id: a-2026-11-18t07-37-17-317z
  - type: activity
    user: Agent
    date: '2026-11-18T07:44:57.188Z'
    comment: >-
      Mocks A/B/C posted for Guy's pick:
      https://claude.ai/artifact/WxrTzDuLUGY9LBgT5J1ddN (B recommended, building
      B). Branch woke/drop-restricted, worktree E:\Git\woke\wt\drop-restricted.
    id: a-2026-11-18t07-44-57-188z
  - type: comment
    user: Agent
    comment: >-
      Option B built on woke/drop-restricted (pushed). Short source chips from
      the wiki on Alt+F "Can drop as" and the tier editor tooltip; random drops
      first. Review fixed, local checks green, data version 23. Handed to the
      coordinator to merge. Waiting on Guy's pick (A/B/C) and his call on
      whether the safety net/price tiers should skip restricted uniques.
    date: '2026-11-18T07:55:56.271Z'
    completionComment: true
    id: c-2026-11-18t07-55-56-271z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-18T07:55:56.271Z'
  - type: activity
    user: Agent
    date: '2026-11-18T07:56:12.354Z'
    comment: >-
      Guy put v1.330.10 on hold for this. Waiting on his layout pick and his
      answer on the safety net before handing it to be merged.
    id: a-2026-11-18t07-56-12-354z
needsAction: null
---
Guy (2026-11-18): on the Alt+F "Can drop as" list (#549), chip uniques that can't drop from random monsters (boss-only, league mechanic, vendor recipe / div card, Vaal transform, drop-disabled), so it's easier to decide whether to show or hide the base. Same info in the base hover tooltip under "Items in this tier" in the tier editor.

Data: PoE wiki cargo `items` (is_drop_restricted, drop_enabled, drop_text, acquisition_tags, drop_monsters) generated into a bundled JSON by a script; uncertain entries flagged.

Flow: mocks (PoE 1 look) → Guy's pick; build the recommended option meanwhile; adversarial review + local checks; branch to coordinator. Ships after v1.330.10.
