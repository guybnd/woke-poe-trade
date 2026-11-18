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
---
> **TL;DR:** On a cluster jewel price check, a dropdown swaps the enchant type (e.g. Attack Damage while Dual Wielding → Spell Damage) so Guy can price a different cluster of the same size. Mocks first, Guy picks.

- Options per size come from the cluster data in `public/data/tree/passive-tree.json` (17 Large, 21 Medium, 17 Small).
- Enchant trade id is `enchant.stat_3948993189|<n>` per type.
- Notables tied to the old type get unticked when the type changes.
- No search runs until Search is pressed.
