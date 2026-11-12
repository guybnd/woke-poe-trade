---
id: WOKEPOET-257
title: >-
  Minimized atlas bar still jumps right when the panel reaches the screen's
  right edge
status: In Progress
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
---
Follow-up to WOKEPOET-216 / #393. Guy: on dev build at master 48ccec5c, Atlas strategies on the left, made big, minimized → bar still jumps to the right edge.

Measured in the live overlay (CDP): anchor tl x 8.16%, panels span 182.9 px to 2560 px on a 2560 screen (list + tree + plan). #393's rule (pin left iff left gap <= right gap) sees right gap 0 → pins right. #396/#400 didn't touch the window code; not a regression.

Fix: wholly on one half → that side; across the middle → anchor side; centre-anchored → nearer edge. Tests in window-controls.test.ts, incl. the measured case.

Branch woke/minimize-wide-left, clone E:\Git\woke-minimize-wide.
