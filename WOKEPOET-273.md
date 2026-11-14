---
id: WOKEPOET-273
title: Price check 3.30 Viscera (Wickerman trophies)
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-14T03:03:56.234Z'
    comment: Created as subtask of WOKEPOET-149.
---
Guy price-checked a Ghostly Claw (Item Class: Viscera, Upper Limb, ilvl 56, implicit "9(8-12)% chance to gain Elusive on Kill") and got Unknown Item.

Cause: the trade site had no Viscera group when the 3.30 data patch ran (PR #423). It does now: group `viscera` (133 bases), categories viscera.head/arm/body/leg.

Fix (branch woke/viscera-items):
- data v8: 133 bases + 60 new implicit stats (41 more implicit ids on known stats), from `node scripts/trade-data-patch.mjs apply --group viscera`
- parser: ItemCategory.Viscera, slot line, Wickerman help line
- price check: base search, or every Viscera of the slot
- fixture rebuilt from the screenshot (not a real Ctrl+C copy yet)

Open:
- 30 boss heads (Sirus' Head, Shaper's Head, Nightmarish ones, Coven Queen's Crown...) aren't on the trade site, so they stay Unknown Item.
- Two Viscera implicits span two lines; the patch skips those, so they show as unknown mods.
- Separate (sent to coordinator for the data-patch thread): 365 of our stat ids are gone from the live trade list ("Grants Level # X Skill" moved to effect_ ids).
