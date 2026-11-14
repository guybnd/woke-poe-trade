---
id: WOKEPOET-283
title: 'Price check: first check in PoE layout never searches'
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
    date: '2026-11-14T05:00:11.076Z'
    comment: Created ticket.
---
Guy priced Mortem Morsu from Ctrl+Space search (right-click > Price check) and the window sat at "Matched: ..." with no listings.

Cause: CheckedItem's body is `v-if="show && (!poeMode || poeOn)"`; in the Tooltip lines (PoE) layout poeOn waits for a code chunk, so the trade listing isn't mounted when the search watcher calls execSearch on nextTick. The search was dropped. Any item, any unique; it hits the first auto-searching check after the overlay starts. Empty mods / 0 DPS are normal for a unique priced by name.

Fix: remember a waiting search and run it when the trade listing mounts. Regression e2e testing/e2e/price-check-poe-first.spec.ts (fails before, passes after). Branch woke/virtual-unique-pc.
