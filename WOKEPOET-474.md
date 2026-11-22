---
id: WOKEPOET-474
title: 'Price check: Kitava''s Thirst trigger line searches 125 instead of 50%'
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T07:36:57.050Z'
    comment: Created ticket.
    id: a-2026-11-22t07-36-57-050z
  - type: activity
    user: Agent
    date: '2026-11-22T07:37:22.055Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/756 open; adversarial
      review and CI running.
    id: a-2026-11-22t07-37-22-055z
---
Foulborn Kitava's Thirst "50% chance to Trigger Socketed Spells when you Spend at least 200 Life..." averaged both numbers (125) and the search found no listings. Trade site stores this stat (and plain Kitava's, Tinkerskin's Phasing, Deerstalker's Movement Speed) by the first number — verified on the live trade API. Death's Oath verified as average, so a whitelist. Guy also asked to check other trigger mods: swept all unique trigger lines; guard test fails on any new unchecked two-number trigger stat. 0% BASE chip checked against trade base percentile filter: correct.
