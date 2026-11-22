---
id: WOKEPOET-484
title: 'Map mods: show each mod''s bonuses (Atlas Drops/rarity/pack, more-X)'
status: In Progress
priority: Medium
effort: M
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T15:18:51.583Z'
    comment: Created ticket.
    id: a-2026-11-22t15-18-51-583z
  - type: activity
    user: Agent
    date: '2026-11-22T15:28:25.193Z'
    comment: >-
      Built on branch woke/map-mod-bonuses (worktree E:\Git\woke\wt\map-bonus,
      renderer/node_modules is a junction to the main clone: don't
      worktree-remove with it). Checks running on GitHub, adversarial review
      running. Guy's A/B/C pick pending on the mocks artifact.
    id: a-2026-11-22t15-28-25-193z
  - type: activity
    user: Agent
    date: '2026-11-22T15:42:18.881Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/770: review fixes in, all
      checks green. Merge waiting on Guy's go (asked in thread; A/B/C pick on
      https://claude.ai/artifact/CZtSGQe3HzFJvPjgeQqH4n).
    id: a-2026-11-22t15-42-18-881z
---
Guy asked for a planner from poedb map mod tables. Option A (recommended, built while his A/B/C pick is pending): bonus numbers + more-X tag + tooltip on every Map mods row, sort by bonus, "Want all with <bonus>", Ctrl+Space lookup. Data: script snapshots poedb Maps_low/mid/top/uber_tier embedded JSON into bundled data once per patch.

Mocks: https://claude.ai/artifact/CZtSGQe3HzFJvPjgeQqH4n
