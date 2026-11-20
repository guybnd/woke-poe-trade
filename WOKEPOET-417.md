---
id: WOKEPOET-417
title: 'Session story: night strip card when you stop playing'
status: In Progress
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T14:24:39.362Z'
    comment: Created ticket.
    id: a-2026-11-20t14-24-39-362z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-20T14:35:30.464Z'
needsAction: null
---
Guy asked to build it (2026-11-20). Mock: https://claude.ai/artifact/C69uz3mGDDWMSQ68RTKcSp option story-B (night strip): one block per map shaded by profit, hideout gaps striped, death ticks, best drop star, totals row (profit, per hour, hideout, deaths). Ctrl+Space "tonight" card.

Data: Farming SessionRecord/LiveRun (mapMs, otherMs, loot), Net worth stash change over the session, death log from Client.txt.
Trigger: Client.txt has no logout line (checked in the real log). Show when the game closes, when the Farming session ends, or after 15 min with no zone change. Never over play.
