---
id: WOKEPOET-273
title: Price check 3.30 Viscera (Wickerman trophies)
status: Done
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
    comment: Created ticket.
    id: a-2026-11-14t03-03-56-234z
  - type: activity
    user: Agent
    date: '2026-11-14T03:03:56.234Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-14t03-03-56-234z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/433. Adversarial review
      clean (slot categories confirmed on the live trade site); 3676 tests,
      typecheck, lint, build pass. Real copy has no Rarity line: read as Normal.
      Waiting on merge via the cloud merge thread.
    date: '2026-11-14T03:13:13.276Z'
    completionComment: true
    id: c-2026-11-14t03-13-13-276z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-14T03:13:13.276Z'
  - type: activity
    user: Agent
    date: '2026-11-14T03:13:13.928Z'
    comment: Updated implementation link.
    id: a-2026-11-14t03-13-13-928z
  - type: comment
    user: Agent
    comment: >-
      Merged as 042e546b. Viscera parse and price check (base + implicit, or
      every Viscera of the slot); data version 8 goes out live. Still open: 30
      boss heads not on trade, two-line implicits skipped, and the 365 dead
      skill-grant stat ids (data-patch thread).
    completionComment: true
    date: '2026-11-14T03:23:22.358Z'
    id: c-2026-11-14t03-23-22-358z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T03:23:22.851Z'
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/433'
baselineCommit: 407ba7f1f2c478fed465d0b71f60be15ccdb1be0
swimlane: null
diffSummary:
  - file: testing/e2e/loot-filter.spec.ts
    additions: 1
    deletions: 1
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
