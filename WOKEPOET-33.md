---
id: WOKEPOET-33
title: Replace the overlay tab bar with a left-edge rail and launcher
status: Done
priority: Medium
effort: M
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T06:34:46.357Z'
    comment: Created ticket.
    id: a-2026-11-05t06-34-46-357z
  - type: activity
    user: Agent
    date: '2026-11-05T07:17:32.200Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/122 merged. The dev copy
      update is held until #121 lands, so Guy gets one restart.
    id: a-2026-11-05t07-17-32-200z
  - type: comment
    user: Agent
    comment: >-
      Rail and launcher shipped in #122, and #144 makes the launcher list every
      tool. Both are merged and live in the dev copy at d880d714. Confirmed
      loaded on the overlay, but not clicked through in game. Implementation:
      https://github.com/guybnd/woke-poe-trade/pull/144
    date: '2026-11-05T10:00:38.504Z'
    completionComment: true
    id: c-2026-11-05t10-00-38-504z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T10:00:38.504Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:53.937Z'
needsAction: null
reviewState: null
---
Guy picked B + C from the mocks: https://claude.ai/artifact/KbQejf7usezNPEXfrcc35S

Rail on the left edge: Tools button, settings and search, pins, other open tools. Tools opens every tool by group, with one box for search and item paste. Ctrl V pastes an item anywhere in the overlay. One-time migration moves existing configs to the rail and a short pin list.
