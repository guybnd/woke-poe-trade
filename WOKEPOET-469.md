---
id: WOKEPOET-469
title: Item tooltips draw behind long-used windows (Net worth)
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
    date: '2026-11-22T05:06:51.422Z'
    comment: Created ticket.
---
Net worth rows showed no item tooltip or one half hidden behind the window. Panel wmZorder grew by one per bring-to-front forever; Net worth reached z 1004 over the tooltip's 1000. Fix: renumber z-orders once past 800 (bring-to-front and config load). Gate gap: tip-audit checked wiring, not paint order; the hover e2e now checks the tooltip is topmost. PR https://github.com/guybnd/woke-poe-trade/pull/750
