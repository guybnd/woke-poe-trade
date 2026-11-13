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
  - type: comment
    user: Agent
    comment: >-
      **Own data instead of upstream APT: A, a full exporter, or B, a 3.30 patch
      layer?** Guy wants our own data (2026-11-11). Upstream's ndjson generator
      is private; only the dat reader (SnosMe/poe-dat-viewer lib/src/cli) is
      public. **A**: export the 3.30 dat tables and write a converter into the
      items/stats.ndjson schema (renderer/src/assets/data/interfaces.ts). About
      2-3 days, English first, maintained every league. **B (recommended)**: at
      launch, read trade site /api/trade/data/stats and /items, then add new or
      reworded stats and new items on top of upstream data. About 1 day, English
      only, and it falls away once upstream updates.
    date: '2026-11-11T05:15:09.405Z'
    id: c-2026-11-11t05-15-09-405z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-11T05:15:09.405Z'
    comment: >-
      **Own data instead of upstream APT: A, a full exporter, or B, a 3.30 patch
      layer?** Guy wants our own data (2026-11-11). Upstream's ndjson generator
      is private; only the dat reader (SnosMe/poe-dat-viewer lib/src/cli) is
      public. **A**: export the 3.30 dat tables and write a converter into the
      items/stats.ndjson schema (renderer/src/assets/data/interfaces.ts). About
      2-3 days, English first, maintained every league. **B (recommended)**: at
      launch, read trade site /api/trade/data/stats and /items, then add new or
      reworded stats and new items on top of upstream data. About 1 day, English
      only, and it falls away once upstream updates.
  - type: comment
    user: Agent
    comment: 'Guy picked B on 2026-11-11 ("Yeah let''s go B"). Built in PR #325.'
    date: '2026-11-11T05:31:46.446Z'
    id: c-2026-11-11t05-31-46-446z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-11T05:31:46.446Z'
    comment: 'Guy picked B on 2026-11-11 ("Yeah let''s go B"). Built in PR #325.'
  - type: comment
    user: Agent
    comment: >-
      **Launch-day steps (PR #325):** once the trade site shows 3.30 items and
      mods, run `node scripts/trade-data-patch.mjs check` and read the report.
      Then run `node scripts/trade-data-patch.mjs apply`, then `node
      renderer/src/assets/bump-data-version.mjs`, and commit and PR. Players get
      the data live, without a release. Baseline: the 3.29 lists saved
      2026-11-11 in `scripts/trade-baseline/`. Bases outside jewel, accessory
      and flask are listed under "Left out", to add by hand. `upstream-data.mjs`
      now only copies files upstream changed, so the hourly job won't revert
      this; when upstream ships 3.30, its files replace ours.
    date: '2026-11-11T05:31:50.288Z'
    selfAttested: true
    summary: >-
      Launch day: run trade-data-patch.mjs check, then apply, then
      bump-data-version, then commit and PR. Baseline is 3.29 in
      scripts/trade-baseline. The upstream copy only takes files upstream
      changed.
    pin: true
    id: c-2026-11-11t05-31-50-288z
  - type: activity
    user: Agent
    date: '2026-11-11T05:39:55.866Z'
    comment: >-
      PR #325 merged as 99b64c0; the dev build is on it. What's left is the
      launch-day run: check, then apply, then bump-data-version, then PR.
    id: a-2026-11-11t05-39-55-866z
  - type: activity
    user: Agent
    date: '2026-11-12T05:34:45.682Z'
    comment: >-
      #356 merged (2c3aa867). When upstream ships new English data, the hourly
      upstream copy now runs trade-data-patch.mjs apply on top and lists what it
      added back in the PR. CI-only, so no dev switch is needed. The launch-day
      run itself is still to do.
    id: a-2026-11-12t05-34-45-682z
  - type: activity
    user: Agent
    date: '2026-11-13T02:43:44.701Z'
    comment: >-
      PR #406 is up (2026-11-13). Unknown item groups are now added by name
      instead of skipped: about 170 Wickerman trophies, per poedb's Covens page.
      The trade "monster" group becomes CAPTURED_BEAST. A live check today found
      Shield Crab, already new on the trade site.
    id: a-2026-11-13t02-43-44-701z
swimlane: null
needsAction: null
---
> TL;DR: regenerate item and stat data from the 3.30 client on launch day. Without it, price check misses every mod GGG reworded.

From the 3.30 patch notes:
- Almost every "nearby" stat now reads as an exact range in metres. That's a wording-only change, but our stat matching is text-based, so the reworded mods go unknown until `stats.ndjson` is regenerated.
- New: 11 uniques, the Mycelium Core jewel base, 10 Threads plus the Frayed Thread, Royal Visage, four Soul Cores, Essence of Trickery, the Allflame Embers of the Cloister, the Divine and the Multitude, the Feral, Immortal and Royal Astrolabes, and the Afarud Enshrouding Crystal.
- Removed: scarabs, the Templar, Fruiting and Deceptive Astrolabes, the Mortal and Sacrifice fragments, the Fragmented Delirium Orb, the Mirage coins and incubators, and Orb of Binding drops. Vials stay as dead items.
- Renamed: Memory Threads to Memory Traces, Skittering to Threaded Delirium Orb, Maven's Chisel of Scarabs to Maven's Chisel of Threads.
- Steps: regenerate `renderer/public/data/*` once the 3.30 data exports are out, then run `bump-data-version.mjs`.
