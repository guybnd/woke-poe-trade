---
id: WOKEPOET-392
title: 'Loot filter bug hunt: group hide fixes and cluster price fallback'
status: Grooming
priority: High
effort: S
assignee: unassigned
tags:
  - bug
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:35:01.011Z'
    comment: Created ticket.
---
Bug hunt team 2 (2026-11-19). Already done on branch `woke/filter-bughunt` (13c5358d, 2c4022b9) and sent to merge.

Fixed:
1. "Hide whole group" matched child types by prefix: Currency also hid 24 groups (Omens, Fossils, Essences, Oils, Splinters, Harvest...); Uniques hid Replicas and Foulborn. Now the exact $type only.
2. Group hide, then Show one tier, left that tier with no sound, beam or map icon. The same happened to own rules copied from that tier. They now come back, but a sound or beam you removed on purpose stays off. Minimal stays quiet.
3. Cluster price rules with no usable poe.ninja price were commented out. They now keep NeverSink's list.

Open, waiting on Guy: boss-only uniques left out of the safety net and price tiers (#616). Not fixed (smaller): unknown base or class saves, Alt+F card keys work window-wide, share "Add" doesn't fold, stacks stay dismissed, low-maps fallback look.
