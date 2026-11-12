---
id: WOKEPOET-117
title: 'Flips table: Supply column, sortable headers, sort by Profit each'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T15:05:28.278Z'
    comment: Created ticket.
    id: a-2026-11-05t15-05-28-278z
  - type: comment
    user: Agent
    comment: >-
      PR #203 is up: Supply column (High from 100 a day, Medium from 20, Low,
      None), sortable headers for item, Price, Profit each and Supply, default
      Profit each. Adversarial review fixes are in; typecheck, lint, unit tests,
      build and Flips e2e pass. Handed to the coordinator for merge. Not
      changed: the dock card still says "Best supply" and "up to Xc a day".
    date: '2026-11-05T15:21:07.955Z'
    completionComment: true
    id: c-2026-11-05t15-21-07-955z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-05T15:21:07.955Z'
  - type: activity
    user: Agent
    date: '2026-11-05T15:21:08.605Z'
    comment: Updated implementation link.
    id: a-2026-11-05t15-21-08-605z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:17:15.166Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/203'
reviewState: null
---
Replace "Market / day" and "Max profit / day" with one "Supply" column (High, Medium, Low) from poe.ninja daily volume. Guy's call: poe.ninja doesn't have the trade house data, so raw numbers don't mean much. Mock: option 3 under "Column names" in https://claude.ai/artifact/HZ3QdC95eYt4ZZY6CPyygs

Make column headers clickable to sort (item, Price, Profit each, Supply). Default sort: Profit each.

Asked by Guy in the Flips thread.
