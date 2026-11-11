---
id: WOKEPOET-153
title: D. Parse item tier from copied items
status: Grooming
priority: High
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
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:18.241Z'
    comment: Updated description. Changed priority to High.
    id: a-2026-11-11t04-22-18-241z
---
> TL;DR: on launch day, copy real 3.30 items to check how the game writes them. Then read the tier into price check as Guy's pick A, a T2-T5 chip by the name (mock https://claude.ai/artifact/XR9H8kNY9NnKJiE6hFmR5F).

From the patch notes: magic and rare items from Act 6 on can have a tier from 2 to 5, and Ruthless has none. A higher tier means higher-tier mods, better bases, more quality, and more sockets and links. Tier 5 can drop with +1 item level, or as a fractured magic item.

Day-one copy checks, with Ctrl+C and Ctrl+Alt+C:
- an unidentified tiered rare and magic item: where the tier line sits
- an anointed amulet and a cluster jewel: "Notable passives are now keyworded instead of a separate display"
- a mod that used to say "nearby"
- a Twice Corrupted item
- a Memory Traces item

Then add the tier to `ParsedItem`, have `match.ts` evaluate `UnidentifiedItemTier` (it returns unknown today), and build the A chip.
