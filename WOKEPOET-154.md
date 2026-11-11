---
id: WOKEPOET-154
title: E. Regenerate item data for 3.30
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
    date: '2026-11-08T09:53:49.889Z'
    comment: Created ticket.
    id: a-2026-11-08t09-53-49-889z
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:49.889Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-08t09-53-49-889z
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:13.290Z'
    comment: Updated description. Changed priority to High.
    id: a-2026-11-11t04-22-13-290z
  - type: activity
    user: Agent
    date: '2026-11-11T05:10:11.226Z'
    comment: >-
      Checked the pipeline on 2026-11-11. Item and stat data comes from upstream
      Awakened PoE Trade through `.github/workflows/upstream-data.yml`, which
      runs hourly (cron 17 * * * *); the last runs succeeded. It bumps
      data-version itself. Risk: upstream's last commit was 2026-09-24, so 3.30
      data only arrives when SnosMe pushes it. If upstream lags past launch, we
      need our own export of stats and items from the 3.30 client.
    id: a-2026-11-11t05-10-11-226z
---
> TL;DR: regenerate item and stat data from the 3.30 client on launch day. Without it, price check misses every mod GGG reworded.

From the 3.30 patch notes:
- Almost every "nearby" stat now reads as an exact range in metres. That's a wording-only change, but our stat matching is text-based, so the reworded mods go unknown until `stats.ndjson` is regenerated.
- New: 11 uniques, the Mycelium Core jewel base, 10 Threads plus the Frayed Thread, Royal Visage, four Soul Cores, Essence of Trickery, the Allflame Embers of the Cloister, the Divine and the Multitude, the Feral, Immortal and Royal Astrolabes, and the Afarud Enshrouding Crystal.
- Removed: scarabs, the Templar, Fruiting and Deceptive Astrolabes, the Mortal and Sacrifice fragments, the Fragmented Delirium Orb, the Mirage coins and incubators, and Orb of Binding drops. Vials stay as dead items.
- Renamed: Memory Threads to Memory Traces, Skittering to Threaded Delirium Orb, Maven's Chisel of Scarabs to Maven's Chisel of Threads.
- Steps: regenerate `renderer/public/data/*` once the 3.30 data exports are out, then run `bump-data-version.mjs`.
