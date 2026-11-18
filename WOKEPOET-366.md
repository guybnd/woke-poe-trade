---
id: WOKEPOET-366
title: 'Price check: pick another cluster jewel type'
status: Grooming
priority: Medium
effort: S
assignee: Agent
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T04:08:42.928Z'
    comment: Created ticket.
    id: a-2026-11-18t04-08-42-928z
  - type: comment
    user: Agent
    comment: >-
      Mocks A/B/C posted for Guy's pick:
      https://claude.ai/artifact/RF9U9wYhr2cqeNgznmDT69 (A recommended: type
      chip in header).
    date: '2026-11-18T04:10:52.042Z'
    selfAttested: true
    id: c-2026-11-18t04-10-52-042z
  - type: activity
    user: Agent
    date: '2026-11-18T04:35:12.784Z'
    comment: >-
      Built C on branch woke/cluster-type (59ac354d): title picker with size
      tabs + type-to-filter, review fixes in. Checks green (lint, tsc, 4434
      unit, build, e2e). Handed to coordinator for merge.
    id: a-2026-11-18t04-35-12-784z
---
> **TL;DR:** On a cluster jewel price check, a dropdown swaps the enchant type (e.g. Attack Damage while Dual Wielding → Spell Damage) so Guy can price a different cluster of the same size. Mocks first, Guy picks.

- Options per size come from the cluster data in `public/data/tree/passive-tree.json` (17 Large, 21 Medium, 17 Small).
- Enchant trade id is `enchant.stat_3948993189|<n>` per type.
- Notables tied to the old type get unticked when the type changes.
- No search runs until Search is pressed.
