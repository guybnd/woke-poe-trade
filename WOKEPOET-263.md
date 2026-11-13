---
id: WOKEPOET-263
title: Atlas strategies read poeplanner atlas tree links
status: Ready
priority: None
effort: S
assignee: unassigned
tags:
  - atlas
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-13T13:46:37.821Z'
    comment: Created ticket.
    id: a-2026-11-13t13-46-37-821z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/418 up; self-reviewed,
      lint/tests/typecheck/build pass locally. On the dev build now. Waiting on
      the cloud merge.
    date: '2026-11-13T13:46:42.564Z'
    completionComment: true
    id: c-2026-11-13t13-46-42-564z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-13T13:46:42.564Z'
needsAction: null
---
> **TL;DR** Pasting a poeplanner.com/atlas-tree link into Atlas strategies now shows and edits the tree. PR #418.

Guy asked whether poeplanner atlas links import. Import accepted them but the tree couldn't decode poeplanner's little-endian format. `decodeTree` now tells the formats apart by the first byte; node ids are GGG's. Variant picks (shrine on Path of Worship) aren't in the link.
