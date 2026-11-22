---
id: WOKEPOET-473
title: 'Net worth: fake poe.ninja price on thin div cards inflates net worth'
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T06:52:00.439Z'
    comment: Created ticket.
---
The Witch (7,075c, really 0.2c) and Rain Tempter (857c, really 0.01c) spiked on poe.ninja 2026-11-22 ~13:50-16:00 Sydney; Guy's 16:00 read had Div cards 107k c, net worth 196k vs ~100k. Both were thin (gaps 6/7). Users report the same skew.

Fix: hold a thin item's 5x+ jump at the last read's price for up to 6h (marker + hover); drop chart points a price glitch pushed up and the next read reverted. Backtest on 3 days of snapshots in the thread.
