---
id: WOKEPOET-404
title: 'Map mods: every mod gets a stash token; search on top; Save can overwrite'
status: Done
priority: Medium
effort: M
assignee: unassigned
tags:
  - map-mods
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T02:31:58.342Z'
    comment: Created ticket.
    id: a-2026-11-20t02-31-58-342z
  - type: comment
    user: Agent
    comment: >-
      PR #662 (https://github.com/guybnd/woke-poe-trade/pull/662). All 309 map
      mods get a token now. Stash search is above Rewards, and Save can
      overwrite. The review bug (sign before the number) is fixed. Local checks
      pass. Sent to merge.
    date: '2026-11-20T02:41:41.194Z'
    completionComment: true
    id: c-2026-11-20t02-41-41-194z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T02:41:41.194Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as f7010e50. All 309 map mods get a stash token now. Stash search
      is above Rewards, and Save can overwrite a saved search (option A).
    completionComment: true
    date: '2026-11-20T02:46:42.144Z'
    id: c-2026-11-20t02-46-42-144z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T02:46:42.712Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/662'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
---
Guy saw "No unique text found for: Buffs on Players expire #% faster" on the Map mods page.

Cause: tokens were plain substrings between the rolled numbers, so a mod whose words all sit in other mods had none. 30 of 309 map mods failed (faster/slower wordings, "#% Pack Size" inside "#% increased Pack size", singular/plural, "Monsters have #% increased AoE" vs the boss line).

Fix (branch woke/map-regex-unique): tokens may cross the number (`\d+`) and pin to a line's start/end (`^`/`$`, as poe.re does). All 309 get a token now; heist and charts had no failures.

Also from Guy in the same thread:
- Stash search section moved above Rewards (juice scoring).
- Save as: arrow lists the tab's saved searches; picking one or typing its name turns Save into Overwrite (option A of mocks A/B/C posted in the thread).

Search builder split into map-mods/search.ts so the startup bundle drops it (1640.5 -> 1636.7 KB).
