---
id: WOKEPOET-24
title: 'Loot filter rule card works on ground items, including hidden ones'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T04:06:05.829Z'
    comment: Created ticket.
    id: a-2026-11-05t04-06-05-829z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T04:11:40.545Z'
  - type: activity
    user: Agent
    date: '2026-11-05T05:06:50.742Z'
    comment: >-
      Merged in PR #100 (master 3151639), live on the dev build. Follow-up PR
      opened for loading when the editor was left open. Waiting on Guy's in-game
      test of the map edit and ground items.
    id: a-2026-11-05t05-06-50-742z
  - type: status_change
    from: In Progress
    to: Done
    user: Agent
    date: '2026-11-12T00:17:33.337Z'
needsAction: null
---
> **TL;DR:** Alt + F already opens the matching filter rule for a hovered item with quick edits. On the ground it releases Alt before copying, so an item your filter hides (only visible while Alt is held) loses its label and nothing is copied. Keep Alt held through the copy.

## Plan
- Loot filter sample hotkey keeps its modifier keys held during the copy (same as the editor hotkey).
- Mention ground items in the hotkey's settings hint.
- Unit test the shortcut definition.

## Open
- Ctrl+C on a ground label needs one in-game confirmation from Guy; no source documents it.
