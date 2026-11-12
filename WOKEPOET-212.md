---
id: WOKEPOET-212
title: Weapon/armour stat header (F1)
status: In Progress
priority: None
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T09:00:46.045Z'
    comment: Created ticket.
    id: a-2026-11-12t09-00-46-045z
  - type: activity
    user: Agent
    date: '2026-11-12T09:12:15.280Z'
    comment: >-
      Built on woke/weapon-stats-header (2540121f): StatHeader.vue +
      stat-header.ts + weapon-dps.ts, FiltersBlock wiring, Total DPS counts
      chaos (trade site's dps includes chaos: Rebuke of the Vaal 352.07 = 166.85
      + 140.39 + 44.8). Unit 3077/3077, e2e stat-header + poe-mode 16/16,
      tsc/lint/build clean. Adversarial review and perf budgets running.
    id: a-2026-11-12t09-12-15-280z
  - type: activity
    user: Agent
    date: '2026-11-12T09:19:44.386Z'
    comment: Updated implementation link.
    id: a-2026-11-12t09-19-44-386z
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/385'
---
Build Guy's picked design F1 (Round 3) from https://claude.ai/artifact/JQEW387nXKJaisCjz94Xvu for the weapon/armour property block at the top of the price check.

- Header replaces unpicked property lines: weapon = big DPS + roll bar, damage-type split bar, phys/ele/chaos legend with roll bars, APS/crit chips; armour = big number per defence + chips for block/base percentile.
- Click toggles the filter (gold outline when picked); picked filter row appears below the header; header never changes shape.
- Include local chaos in total DPS if the trade site's dps filter counts it.
- No searches on click, one delegated listener, perf budgets.

Branch woke/weapon-stats-header, worktree E:\Git\woke-poe-trade-wstats.
