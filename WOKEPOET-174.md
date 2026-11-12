---
id: WOKEPOET-174
title: 'Board sweep: close merged tickets, and move tickets to Done on merge'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags:
  - tooling
  - cleanup
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:44.259Z'
    comment: Created ticket.
    id: a-2026-11-10t02-55-44-259z
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:44.259Z'
    comment: Created as subtask of WOKEPOET-168.
    id: a-2026-11-10t02-55-44-259z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T05:29:35.986Z'
  - type: comment
    user: Agent
    comment: >-
      Done 2026-11-12. The board sweep closed 48 merged or stale tickets, and
      the project's PR flow now ends with finish_ticket on merge (in the project
      instructions). Tickets 1, 2 and 7 were archived, and 3-6 got Guy's picks.
    date: '2026-11-12T05:29:37.402Z'
    selfAttested: true
    id: c-2026-11-12t05-29-37-402z
needsAction: null
---
Review finding B2. About 35 tickets sit in Ready though their work merged, including Critical WOKEPOET-63 and 64 (merged as #127, #131), 65-67 (#136, #138, #139), 81 (#157), 120 and 137 (releases published), 125 (#214), 160 (#275), 166 (#290). WOKEPOET-1 to 7 have been in Grooming since day one.

Do: check each Ready ticket against merged pull requests and finish the ones that merged; ask Guy about 1-7; add "move the ticket to Done" to the merge step in the project's PR flow.
