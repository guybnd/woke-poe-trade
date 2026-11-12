---
id: WOKEPOET-216
title: Minimized panel bar jumps to the far right after a wide panel is minimized
status: In Progress
priority: Medium
effort: S
assignee: Agent
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T10:17:03.789Z'
    comment: Created ticket.
---
Guy put Atlas strategies on the left, made it big, then minimized it: the bar landed on the far right.

Cause: `minimizeAnchor` (renderer/src/web/woke/ui/window-anchor.ts) picked the pinned side from the panel's centre. A panel stretched wide from the left has its centre past the middle, so the bar pinned to the panel's right edge. Shared by every panel (PoB builds, etc.).

Fix: pin the edge the panel is anchored by (`*l` → left, `*r` → right); centre-anchored panels go by the nearer screen edge. Tests in window-controls.test.ts.

Branch: woke/minimize-keep-position (worktree E:\Git\woke-minimize-pos).
