---
id: WOKEPOET-216
title: Minimized panel bar jumps to the far right after a wide panel is minimized
status: Done
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
    id: a-2026-11-12t10-17-03-789z
  - type: activity
    user: Agent
    date: '2026-11-12T10:20:31.330Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/393. Pins the panel edge
      nearer its screen side. Self-reviewed (fitShift, full-width, unmoved
      restore, saved states); vitest 3119 pass, lint clean, build passes. Sent
      to coordinator for cloud merge.
    id: a-2026-11-12t10-20-31-330z
  - type: comment
    user: Agent
    comment: 'PR #393 reviewed, local checks pass, squash-merged as 536fb2c0.'
    date: '2026-11-12T10:29:29.624Z'
    completionComment: true
    id: c-2026-11-12t10-29-29-624z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-12T10:29:29.624Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 536fb2c0. Minimized bar now pins the panel edge nearer its
      screen side, so a wide panel on the left stays left. Goes live in the dev
      build when the tree overlay thread moves it to master after #391.
    completionComment: true
    date: '2026-11-12T10:29:33.496Z'
    id: c-2026-11-12t10-29-33-496z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T10:29:33.834Z'
needsAction: null
reviewState: approved
baselineCommit: 4cf5d0ff7c5caef33fd34897ba841c262fe72169
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/393'
swimlane: null
diffSummary:
  - file: scripts/upstream-data.mjs
    additions: 21
    deletions: 1
---
Guy put Atlas strategies on the left, made it big, then minimized it: the bar landed on the far right.

Cause: `minimizeAnchor` (renderer/src/web/woke/ui/window-anchor.ts) picked the pinned side from the panel's centre. A panel stretched wide from the left has its centre past the middle, so the bar pinned to the panel's right edge. Shared by every panel (PoB builds, etc.).

Fix: pin the edge the panel is anchored by (`*l` → left, `*r` → right); centre-anchored panels go by the nearer screen edge. Tests in window-controls.test.ts.

Branch: woke/minimize-keep-position (worktree E:\Git\woke-minimize-pos).
