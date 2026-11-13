---
id: WOKEPOET-259
title: 'N. Covens league mechanic: Wickerman trophies and Fates'
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
    date: '2026-11-13T02:43:43.229Z'
    comment: Created ticket.
    id: a-2026-11-13t02-43-43-229z
  - type: activity
    user: Agent
    date: '2026-11-13T02:43:43.229Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-13t02-43-43-229z
  - type: comment
    user: Agent
    comment: >-
      **What should the Covens League mechanics card show?** A: Wickerman trophy
      prices by slot (head, torso, limbs). B: A plus a Fate combo helper (which
      cards share reward icons). C: A plus "trophies worth keeping for your
      build" from your PoB. My pick is A first, then B, once Fates are seen in
      game.
    date: '2026-11-13T02:43:50.289Z'
    id: c-2026-11-13t02-43-50-289z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-13T02:43:50.289Z'
    comment: >-
      **What should the Covens League mechanics card show?** A: Wickerman trophy
      prices by slot (head, torso, limbs). B: A plus a Fate combo helper (which
      cards share reward icons). C: A plus "trophies worth keeping for your
      build" from your PoB. My pick is A first, then B, once Fates are seen in
      game.
swimlane: require-input
needsAction: null
---
> TL;DR: a League mechanics card for Covens, the 3.30 league mechanic. The card's content waits on Guy's pick; trophy prices wait on poe.ninja.

From poedb (https://poedb.tw/us/Covens_items, 2026-11-13), there are 188 Covens items:
- About 170 **Wickerman trophies**, one per boss, each for one slot: Head, Torso, Upper Limb or Lower Limb. Each carries one mod, for example "Sirus' Head: Transfiguration of Mind" or "Maven's Orrery: Enemies within 3 metres are Scorched". The reveal says they come in 3 tiers. **Nightmarish** ones (Book of Depravity, Head of Uhtred, Core of the Unbreakable, Wings of Lycia, Wings of Catarina) and the **Coven Queen's Crown** look like the top end.
- **Fate cards** empower area bosses. Matching reward icons combo, and invoking the same card twice triples its rewards.
- Also new: Cursed Poppet (unknown use), Mycelium Core (jewel), 10 Threads plus Frayed Thread (stack 100), Royal Visage, Soul Core of Instability, the Immortal, Feral, Royal and Cryptic Astrolabes, and Essence of Trickery.

Toolkit work:
1. **Data:** trophies and Threads come in through the launch-day patch (WOKEPOET-154). Since #406, trophies are added by name.
2. **Price check:** a trophy copy needs checking on day one (WOKEPOET-153): item class, tier line, and whether its mod line matches a trade stat.
3. **Loot filter:** a trophy group and a Thread group (WOKEPOET-191), once NeverSink names them.
4. **League mechanics card:** **design pick for Guy.** Options:
   - A: trophy prices by slot
   - B: A plus a Fate combo helper
   - C: A plus a "trophies worth keeping for your build" view
