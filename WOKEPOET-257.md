---
id: WOKEPOET-257
title: >-
  Minimized atlas bar still jumps right when the panel reaches the screen's
  right edge
status: Done
priority: Medium
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T13:49:04.828Z'
    comment: Created ticket.
    id: a-2026-11-12t13-49-04-828z
  - type: comment
    user: Agent
    comment: >-
      PR #403 has been reviewed adversarially, passed local checks, and was
      squash-merged as 168c1f66. The dev build is updated.
    date: '2026-11-12T14:02:12.320Z'
    completionComment: true
    id: c-2026-11-12t14-02-12-320z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-12T14:02:12.320Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 168c1f66 and live on the dev build. When a panel crosses the
      middle of the screen, the bar pins left if the left gap is the smaller
      one, or if the panel is anchored left. That keeps Atlas strategies on the
      left. The adversarial review found that a right-anchored panel dragged
      back to the left would jump right. That's fixed and has a test.
    completionComment: true
    date: '2026-11-12T14:02:17.997Z'
    id: c-2026-11-12t14-02-17-997z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T14:02:18.290Z'
needsAction: null
reviewState: approved
baselineCommit: 4cf5d0ff7c5caef33fd34897ba841c262fe72169
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/403'
swimlane: null
diffSummary:
  - file: scripts/upstream-data.mjs
    additions: 21
    deletions: 1
---
Follow-up to WOKEPOET-216 / #393. Guy: on dev build at master 48ccec5c, Atlas strategies on the left, made big, minimized → bar still jumps to the right edge.

Measured in the live overlay (CDP): anchor tl x 8.16%, panels span 182.9 px to 2560 px on a 2560 screen (list + tree + plan). #393's rule (pin left iff left gap <= right gap) sees right gap 0 → pins right. #396/#400 didn't touch the window code; not a regression.

Fix: wholly on one half → that side; across the middle → anchor side; centre-anchored → nearer edge. Tests in window-controls.test.ts, incl. the measured case.

Branch woke/minimize-wide-left, clone E:\Git\woke-minimize-wide.
