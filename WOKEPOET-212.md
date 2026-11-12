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
---
Build Guy's picked design F1 (Round 3) from https://claude.ai/artifact/JQEW387nXKJaisCjz94Xvu for the weapon/armour property block at the top of the price check.

- Header replaces unpicked property lines: weapon = big DPS + roll bar, damage-type split bar, phys/ele/chaos legend with roll bars, APS/crit chips; armour = big number per defence + chips for block/base percentile.
- Click toggles the filter (gold outline when picked); picked filter row appears below the header; header never changes shape.
- Include local chaos in total DPS if the trade site's dps filter counts it.
- No searches on click, one delegated listener, perf budgets.

Branch woke/weapon-stats-header, worktree E:\Git\woke-poe-trade-wstats.
