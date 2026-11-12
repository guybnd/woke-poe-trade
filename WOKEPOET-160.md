---
id: WOKEPOET-160
title: Remove Heist gem OCR feature
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - cleanup
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-08T15:24:50.602Z'
    comment: Created ticket.
    id: a-2026-11-08t15-24-50-602z
  - type: activity
    user: Agent
    date: '2026-11-08T15:40:13.600Z'
    comment: Updated implementation link.
    id: a-2026-11-08t15-40-13-600z
  - type: comment
    user: Agent
    comment: >-
      Merged as 56e0395 (PR #275). Heist gem OCR removed; shared OCR kept. Site
      redeployed without it; dev build on 56e0395.
    date: '2026-11-08T15:49:45.925Z'
    completionComment: true
    id: c-2026-11-08t15-49-45-925z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-08T15:49:45.925Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:17:19.120Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/275'
needsAction: null
reviewState: null
---
Remove the Heist gem OCR feature: code, settings, hotkeys, tests/fixtures, docs/README and landing page references. Keep shared OCR code used by map mods, essences etc.
