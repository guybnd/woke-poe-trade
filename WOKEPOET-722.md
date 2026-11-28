---
id: WOKEPOET-722
title: Alt+F on a magic Crimson Jewel shows the unique jewel card
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - loot-filter
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-28T09:58:08.420Z'
    comment: Created ticket.
---
Guy 2026-11-28: Alt+F on a magic "Parrying Crimson Jewel of Spirit" showed the unique Crimson Jewel card. Cause: jewel rows' `bt` names only Cobalt Jewel, so `itemFor` fell back to the unique base row. Fix: match rows by `bts`, never pick a uniques row for a non-unique item. PR https://github.com/guybnd/woke-poe-trade/pull/1092
