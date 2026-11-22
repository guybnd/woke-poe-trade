---
id: WOKEPOET-468
title: 'Price check: show each defence/DPS max roll in the stat header'
status: In Progress
priority: Medium
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T05:04:37.380Z'
    comment: Created ticket.
    id: a-2026-11-22t05-04-37-380z
  - type: activity
    user: Agent
    date: '2026-11-22T05:05:54.187Z'
    comment: >-
      Mockups for Guy (pick buttons):
      https://claude.ai/artifact/XLdTTCJWWVZjdpn5pqgDpp . Building A meanwhile.
    id: a-2026-11-22t05-05-54-187z
  - type: activity
    user: Agent
    date: '2026-11-22T05:13:21.982Z'
    comment: >-
      Guy picked B (min..max under each big number's bar; chips hover only).
      Implemented on woke/max-roll, PR
      https://github.com/guybnd/woke-poe-trade/pull/751. Over-20% quality
      counted at item's own quality.
    id: a-2026-11-22t05-13-21-982z
---
Guy asked if the price check can show what a max roll of the item's values could be (armour 2206 / ES 474 chips). The filter bounds already hold the max: base top roll + each local mod at its tier max, at Q20. Show it in the stat header (armour/weapon). Better-tier ceiling needs mod tier data we don't ship: out of scope.
