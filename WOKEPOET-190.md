---
id: WOKEPOET-190
title: K. Harvest swap and craft costs for 3.30
status: Ready
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
    date: '2026-11-11T04:22:38.177Z'
    comment: Created ticket.
    id: a-2026-11-11t04-22-38-177z
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:38.177Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-11t04-22-38-177z
  - type: comment
    user: Agent
    comment: >-
      **Swap costs follow 3.30: 300 each of two colours, plus a Rancour for
      damage swaps.** The second colour is unconfirmed, so the cheaper one is
      counted and the price reads "about". PR
      https://github.com/guybnd/woke-poe-trade/pull/324. Local checks pass. On
      launch day, check which second colour the bench really asks for.
    date: '2026-11-11T05:10:09.024Z'
    completionComment: true
    id: c-2026-11-11t05-10-09-024z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-11T05:10:09.024Z'
needsAction: null
---
> TL;DR: Harvest swap prices use the old 500-of-one-colour cost. 3.30 changes it to 300 each of two colours.

From the patch notes:
- Resistance swaps cost 300 Lifeforce of two different types (previously 500 of one).
- Damage-type swaps cost 300 Lifeforce of two types plus a Crystallised Rancour.
- The divination card stack craft costs 1000 each of Primal, Wild and Vivid (previously 1500 Vivid).
- Lifeforce now drops in bigger stacks from fewer monsters. Tier 1 seed monsters drop none.
Update the swap pricing from #277, #279 and #280, the Flips Harvest lifeforce cost, and the guide text.
