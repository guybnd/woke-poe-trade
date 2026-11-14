---
id: WOKEPOET-276
title: 'PoB tree follows passive points, not just its title'
status: In Progress
priority: None
effort: S
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T04:15:56.311Z'
    comment: Created ticket.
---
Guy (2026-11-14): at level 39, auto still shows the Level 33 tree. Does it count quest passives?

Cause: the tree in use went by title only. Fix in PR https://github.com/guybnd/woke-poe-trade/pull/437: points = level − 1 + quest rewards from earlier acts (Bandits left out), conservative cost; Next/pins/hover card step from the title's tree. Open: going back to an earlier act's zone for a lab can step the tree back for the time you're there. Not tried in game.
