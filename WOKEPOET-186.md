---
id: WOKEPOET-186
title: 'UI 6: dock icon glow pulses forever'
status: Grooming
priority: Low
effort: XS
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-169
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:27.743Z'
    comment: Created ticket.
    id: a-2026-11-10t02-56-27-743z
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:27.743Z'
    comment: Created as subtask of WOKEPOET-169.
    id: a-2026-11-10t02-56-27-743z
  - type: comment
    user: Agent
    comment: >-
      Should the dock icon glow be steady (my pick, per P15), pulse 3 times then
      go steady, or stay as an endless pulse?
    date: '2026-11-10T07:07:26.878Z'
    id: c-2026-11-10t07-07-26-878z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-10T07:07:26.878Z'
    comment: >-
      Should the dock icon glow be steady (my pick, per P15), pulse 3 times then
      go steady, or stay as an endless pulse?
swimlane: require-input
needsAction: null
---
Charter P15: nothing loops or pulses for attention. `renderer/src/web/woke/dock/DockIcon.vue:276` runs `dock-glow 1.6s infinite` on `.glow`. Make it a steady glow (the reduced-motion style at line 282 already is one), or pulse a few times and stop. Guy's call if he likes the pulse.
