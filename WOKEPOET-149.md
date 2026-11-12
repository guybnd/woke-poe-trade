---
id: WOKEPOET-149
title: 'Epic: 3.30 Covens of Umbra readiness'
status: Grooming
priority: High
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-08T09:30:02.533Z'
    comment: Created ticket.
    id: a-2026-11-08t09-30-02-533z
  - type: comment
    user: Agent
    comment: >-
      Which prep should I start? Recommended: A (filter accepts the new tier
      keyword so NeverSink 3.30 filters load clean), B (Covens of Umbra league
      name + scarab views behind a 3.30 flag), C (mocks for the tier badge in
      filter rules and price check). D-H wait for real patch notes / day-one
      item copies.
    date: '2026-11-08T09:30:06.748Z'
    id: c-2026-11-08t09-30-06-748z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-08T09:30:06.748Z'
    comment: >-
      Which prep should I start? Recommended: A (filter accepts the new tier
      keyword so NeverSink 3.30 filters load clean), B (Covens of Umbra league
      name + scarab views behind a 3.30 flag), C (mocks for the tier badge in
      filter rules and price check). D-H wait for real patch notes / day-one
      item copies.
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:41.222Z'
    comment: Updated title.
    id: a-2026-11-08t09-53-41-222z
  - type: comment
    user: Agent
    comment: >-
      From the project review (WOKEPOET-168, finding A3): launch is 13 Nov and
      this epic has no plan picked. Proposed day-one minimum: (1) a "being
      updated for 3.30" banner on the scarab-based tools (Flips, Atlas
      strategies, scarab stash outlines) and the mechanics guide; (2) unknown
      filter keywords treated as a warning so a new NeverSink file still loads;
      (3) a 0.4.x release out before launch, which needs WOKEPOET-170 first.
    date: '2026-11-10T02:56:29.597Z'
    selfAttested: true
    id: c-2026-11-10t02-56-29-597z
  - type: comment
    user: Agent
    comment: >-
      Guy picked "Do more" on 2026-11-12 and said yes to starting the day-one
      minimum. Merged as #353 (2e9f776): a "being updated for 3.30" banner on
      the mechanics guide and atlas strategies (remove both when WOKEPOET-156
      lands), plus a test that keeps unknown filter keywords loading and saving.
      The Flips scarab tab already drops out (#151). Still open: the 0.4.3
      release waits on Guy's go, and he hasn't said what "more" covers yet.
    date: '2026-11-12T04:53:38.774Z'
    selfAttested: true
    pin: true
    id: c-2026-11-12t04-53-38-774z
swimlane: require-input
needsAction: null
subtasks:
  - WOKEPOET-150
  - WOKEPOET-151
  - WOKEPOET-152
  - WOKEPOET-153
  - WOKEPOET-154
  - WOKEPOET-155
  - WOKEPOET-156
  - WOKEPOET-157
  - WOKEPOET-159
  - WOKEPOET-188
  - WOKEPOET-189
  - WOKEPOET-190
  - WOKEPOET-191
  - WOKEPOET-192
  - WOKEPOET-193
  - WOKEPOET-211
---
## What's coming (3.30 Covens of Umbra, launches Fri 13 Nov 2026 19:00 UTC; Allflame ends 9 Nov)
Sources: GGG ExileCon announcement (forum thread 4012710, thin on detail), Maxroll reveal summary, Output Lag recaps. **3.30 patch notes are not out yet** (forum patch-notes list tops at 3.29.3c on 8 Nov); expect them ~11-12 Nov.

- Scarabs removed, replaced by **Threads** (one type per league mechanic, up to 8 per mechanic, up to 3 thread types per map).
- **Atlas passive tree fully reworked**; old scarab effects become notables. Many mechanics reworked (Harvest roots in-map, no separate grove; Heist/Delve/Sanctum resources from specific maps; Atziri replaces the Omnitect in Temple; Gwennen coin-flip craft; beastcrafting needs no yellow beasts). Mechanics adjacent to each other synergise. Mirage moves to core.
- **Tiered magic/rare drops (tiers 1-5)**: higher tier = higher-level mods, more sockets/links, better bases; T5 rares can be Simplex Amulet / Cord Belt; T5 magic can drop fractured. Monster rarity drives tier odds and currency; item quantity no longer a reward stat.
- **Filters:** GGG said tiered items "can be selected in item filters". Exact PoE1 syntax unannounced. PoE2's equivalent is `UnidentifiedItemTier` (NeverSink PoE2 0.7.7); likely the same keyword.

## Impact on our modules (origin/master 4b4955af)
1. **Loot filter editor** (`loot-filter/parse.ts`, `validate.ts`, `match.ts`, `RuleBuilder`, `strictness`, `NeverSinkTab`): new condition is not in our key lists, so NeverSink's 3.30 filter will show "unknown condition" warnings and matching goes "unknown" for every tiered block. Must add the keyword, an item tier on the parsed item, a RuleBuilder control, strictness rows. Scarab sections in `drops.ts`/`economy.ts`/`safety.ts`/`nav.ts` become dead; Threads need a group.
2. **Item parser / price check** (`parser/Parser.ts`, `price-check/filters`): clipboard text for unidentified tiered items is unknown; need a day-one sample copy, then parse the tier and show it (and maybe a trade filter if GGG adds one). `FilterModifierTiers` unaffected (mod tiers still come from the trade API).
3. **Scarab flips** (`scarab-flip/*`), stash OCR (`main/src/woke/stash-scarab-data.ts`), dock/shortcut entries: scarab vendor flips die. Decide: retire, or convert to Thread flips if a 3-to-1 or reroll exists (unknown).
4. **Atlas** (`atlas/tree.ts`, `guide.ts`, `farming/*`): tree loads from GGG's atlastree-export at runtime, so new nodes come in once GGG pushes; but guide strategies and farming presets that reference scarabs/node names go stale. Rewrite strategies after the tree is out.
5. **Mechanics guide** (`mechanics/data.ts`, `guide.ts`, Harvest/Temple/Heist/Delve/Sanctum tabs): many texts wrong after rework.
6. **Map mod checker** (`map-mods/*`, `price-check/filters/pseudo/maps.ts`): scarab references in rules/regex; map mod pool may change; Atzoatl rules (`pseudo/atzoatl-rules.ts`) touched by Temple changes.
7. **Item data** (`renderer/public/data/*`): new bases, Threads, uniques; scarabs removed. Regenerate + `bump-data-version.mjs` once the 3.30 client data is out.
8. **League invest / migration watcher** (`league-invest/*`, `background/Leagues.ts`): add "Covens of Umbra"; scarab-based invest lines go away; quantity-based rows stale.

## Recommended prep (pending Guy's pick)
- **Before launch (now):** A. filter: accept the tier keyword (parse/validate/match) so NeverSink 3.30 filters load clean; B. league name + scarab references hidden behind a "3.30" flag; C. mocks for the tier UI (filter rule row + price check badge).
- **Day 1-2:** D. capture real copy text and real filter syntax, wire tier parsing; E. data regen + bump; F. retire/convert scarab flips.
- **Week 1:** G. atlas strategies + mechanics guide rewrite; H. Thread EV / flips if a market forms.
