---
id: WOKEPOET-189
title: J. Map mod checker and map stats for 3.30
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
    date: '2026-11-11T04:22:34.467Z'
    comment: Created ticket.
    id: a-2026-11-11t04-22-34-467z
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:34.467Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-11t04-22-34-467z
  - type: comment
    user: Agent
    comment: >-
      **How should the map checker treat the new rare-map content suffixes
      (Mirage, Viridian Wildwood, buried Sentinels, Evocators, Mirror of
      Delirium)?** Options: mark them as a plus (green), or leave them neutral.
      My default is green.
    date: '2026-11-11T04:23:03.043Z'
    id: c-2026-11-11t04-23-03-043z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-11T04:23:03.043Z'
    comment: >-
      **How should the map checker treat the new rare-map content suffixes
      (Mirage, Viridian Wildwood, buried Sentinels, Evocators, Mirror of
      Delirium)?** Options: mark them as a plus (green), or leave them neutral.
      My default is green.
  - type: activity
    user: Agent
    date: '2026-11-11T05:10:15.903Z'
    comment: >-
      The Atlas Drops mod wording comes with the 3.30 stat data (WOKEPOET-154).
      Wait for it rather than guess the string.
    id: a-2026-11-11t05-10-15-903z
  - type: comment
    user: Agent
    comment: >-
      Guy, 2026-11-11: the game already colours these suffixes differently, so
      the map checker leaves them neutral and adds no highlight of its own.
    date: '2026-11-11T05:10:52.166Z'
    id: c-2026-11-11t05-10-52-166z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-11T05:10:52.166Z'
    comment: >-
      Guy, 2026-11-11: the game already colours these suffixes differently, so
      the map checker leaves them neutral and adds no highlight of its own.
swimlane: null
needsAction: null
---
> TL;DR: map mods changed in 3.30. Quantity became Atlas Drops, rare maps get new content suffixes, and some corruption outcomes are gone.

From the patch notes:
- "Replaced Item Quantity on Map Modifiers with Atlas Drops at the same values", old items included. Anything that sums or scores map quantity (map-mods rules, `price-check/filters/pseudo/maps.ts`, map regexes) has to read Atlas Drops. Unidentified maps give +30% Atlas Drops.
- New rare-map suffixes, shown in a different colour: buried Pandemonium, Apex and Stalker Sentinels, Mirage, Viridian Wildwood, the three Evocators, and Mirror of Delirium. Decide whether the checker flags them as good.
- "This Map's Modifiers to Atlas Drops also apply to Item Rarity" replaces the old quantity-to-rarity mod.
- Removed: the 8-mod corruption reroll (now +2 mods, up to 9), the +10-20% quantity corruption implicit, and the Vaal side area implicit. The rarity corruption implicit is now +10-20%.
- Delirium Orbs now add a Delirious % explicit mod to rare maps.
- The Temple map rooms can corrupt maps a second time.
- Map list: 31 maps added and 31 removed.
