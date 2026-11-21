---
id: WOKEPOET-427
title: Spending shouldn't tank profit/hour (purchases read as losses)
status: In Progress
priority: Medium
effort: None
assignee: unassigned
tags:
  - net-worth
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T02:42:08.221Z'
    comment: Created ticket.
    id: a-2026-11-21t02-42-08-221z
  - type: activity
    user: Agent
    date: '2026-11-21T02:43:31.859Z'
    comment: >-
      Options for Guy (pick buttons):
      https://claude.ai/artifact/P5pQQGJLyFdVnDrVY7Yzmv . Building A
      (auto-detect purchases + per-refresh toggle) meanwhile.
    id: a-2026-11-21t02-43-31-859z
---
Buying an item (e.g. 50 d) removes currency from stash; the bought item is equipped or unpriced, so diffStash books a -50 d net change. That flows into Net worth per-hour rates (play-time.ts playRate via ledger points), session profit (gains.ts stashGainsBetween -> Net worth session, Session story "Farming profit").

Plan: flag a read as a spend when a big net drop is mostly currency leaving with little coming in; spends count 0 toward profit/hour and session profit, show as a marker, and can be toggled per refresh. Options mocked for Guy in an artifact.
