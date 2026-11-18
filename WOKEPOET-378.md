---
id: WOKEPOET-378
title: 'Fix e2e: unique-base tooltip never appears (item-tip.spec.ts:104)'
status: In Progress
priority: Medium
effort: None
assignee: unassigned
tags:
  - bug
  - testing
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T14:18:55.626Z'
    comment: Created ticket.
---
On master 3c634d10, testing/e2e/item-tip.spec.ts:104 ("a base in a unique tier lists the uniques it can drop as, with their prices") fails locally on every run: hovering the Leather Belt chip in the loot filter's "Items in this tier" list shows no tooltip. Fake-game CI also failed it on PR #627. The cause isn't known yet; the code hasn't changed since #525 (15 Nov), so it may depend on the date or on how old the fixtures are.

Done when: the cause is found and fixed (or the test is fixed if the test itself is wrong), item-tip.spec.ts passes locally, and the branch is handed to the coordinator.
