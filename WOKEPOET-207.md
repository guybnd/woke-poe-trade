---
id: WOKEPOET-207
title: 'Pins for PoB build and dock cards, smaller text, see-through pins'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T00:44:44.693Z'
    comment: Created ticket.
    id: a-2026-11-12t00-44-44-693z
  - type: comment
    user: Agent
    comment: >-
      Pick an option per question on
      https://claude.ai/artifact/QUBtX3QL74E3mUT4BWvPGv (PoB pin, card pin,
      smaller text, see-through pins), and say what "hideout repo" means there.
    date: '2026-11-12T00:44:49.985Z'
    id: c-2026-11-12t00-44-49-985z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-12T00:44:49.985Z'
    comment: >-
      Pick an option per question on
      https://claude.ai/artifact/QUBtX3QL74E3mUT4BWvPGv (PoB pin, card pin,
      smaller text, see-through pins), and say what "hideout repo" means there.
swimlane: require-input
needsAction: null
---
Player feedback (Jacket, Discord): pin the PoB build on screen while buying gear and allocating points; pin expanded dock cards so they stay open in maps; let text go smaller; pinned tree/build see-through ("don't need it full blast"). "Hideout repo" unclear, asked on the mock page.

Today (master 337d5118):
- PoB panel is `invisible-on-blur`: vanishes when the game takes focus. Its "Pin to top" only sorts the build list.
- Dock cards: only campaign and lab are pinnable. Click pin ('click') ends when the overlay closes; key pin ('key') is campaign/lab only (dock/DockItem.vue togglePin).
- Text size 100–150% (woke/ui/text-scale.ts), Panel size 70–160% (Auto = 135% at 1440p).
- Panel opacity (Settings › Look) fades backgrounds only; text and the tree drawing stay solid.

Mocks with pick buttons: https://claude.ai/artifact/QUBtX3QL74E3mUT4BWvPGv (picks saved in its db at picks/current). Recommended: PoB A (pin whole panel), cards A (pin button on every card), text A (floor 70%), see-through B (own Pinned opacity, solid on hover).

No code until Guy picks.
