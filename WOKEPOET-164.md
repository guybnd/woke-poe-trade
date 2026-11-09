---
id: WOKEPOET-164
title: 'Price check: search abyssal socket count on variant uniques'
status: Ready
priority: Medium
effort: None
assignee: Agent
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-09T09:25:09.741Z'
    comment: Created ticket.
    id: a-2026-11-09t09-25-09-741z
  - type: activity
    user: Agent
    date: '2026-11-09T09:26:06.197Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/278 up; self-reviewed,
      lint + 2797 tests + build pass. Merge blocked on PC, handed to cloud merge
      thread.
    id: a-2026-11-09t09-26-06-197z
  - type: comment
    user: Agent
    comment: >-
      Merged as 04f046db (PR #278) and live on the dev build. Variant uniques'
      abyssal socket count is shown, ticked and pinned to the exact number.
    date: '2026-11-09T09:33:43.564Z'
    completionComment: true
    id: c-2026-11-09t09-33-43-564z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-09T09:33:43.564Z'
needsAction: null
---
Bubonic Trail (and Lightpoacher, Tombfist, Shroud of the Lightless, Command of the Pit, Hale Negator) drop with different abyssal socket counts. The game's item text prints "Has 2 Abyssal Sockets" with no range, so the price check took it for a fixed roll and hid it under Stats ignored. Fix: show, tick, and pin the exact count for these uniques.
