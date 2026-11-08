---
id: WOKEPOET-153
title: D. Parse item tier from copied items
status: Grooming
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:48.273Z'
    comment: Created ticket.
    id: a-2026-11-08t09-53-48-273z
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:48.273Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-08t09-53-48-273z
  - type: activity
    user: Agent
    date: '2026-11-08T15:12:21.221Z'
    comment: Updated description.
    id: a-2026-11-08t15-12-21-221z
---
> TL;DR: after launch, read the tier from a real Ctrl+C copy and show it as Guy's pick A: a T1-T5 chip next to the item name in price check (mock https://claude.ai/artifact/XR9H8kNY9NnKJiE6hFmR5F).

Needs a real day-one Ctrl+C copy of a tiered magic/rare item. Add tier to `ParsedItem`, feed it into filter matching (`match.ts`: `UnidentifiedItemTier` currently returns unknown) and the A chip; add a trade filter if the trade site gets one.
