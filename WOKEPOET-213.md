---
id: WOKEPOET-213
title: 'Loot filter presets, second batch (12 one-click presets)'
status: Done
priority: Medium
effort: L
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T09:48:31.385Z'
    comment: Created ticket.
    id: a-2026-11-12t09-48-31-385z
  - type: activity
    user: Agent
    date: '2026-11-12T09:48:52.883Z'
    comment: >-
      Implemented on woke/presets-batch2 (0467537b): 12 presets, tests
      (filter-presets-2 + all-levels check in filter-rules), lint/tsc/3106
      tests/build pass, all JS 4904 KB. Adversarial review running.
    id: a-2026-11-12t09-48-52-883z
  - type: activity
    user: Agent
    date: '2026-11-12T10:04:52.979Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/389 open. Review found 4
      bugs (ilvl84 jewellery hidden, influenced maps hidden, vendor gem rule
      over 21/20 & 23q gems on Uber+, vendor flasks over endgame tiers), all
      fixed with real-NeverSink tests. Asked the coordinator to merge via the
      cloud thread.
    id: a-2026-11-12t10-04-52-979z
  - type: comment
    user: Agent
    comment: >-
      PR #389 reviewed (4 bugs fixed), local checks pass, squash-merged as
      736b6420.
    date: '2026-11-12T10:12:56.836Z'
    completionComment: true
    id: c-2026-11-12t10-12-56-836z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-12T10:12:56.837Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 736b6420: 12 new loot filter presets (all off by default),
      review fixes included. Skipped: stacked-deck card list (tool has none),
      unbonused-map rule (NeverSink has none; keeps progress maps instead),
      tiered drops (TODO for 3.30), regal recipe (Guy said no). Dev build not
      switched: it's running another thread's branch
      (claude/project-thread-ttahrs).
    completionComment: true
    date: '2026-11-12T10:13:02.666Z'
    id: c-2026-11-12t10-13-02-666z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T10:13:03.002Z'
needsAction: null
reviewState: approved
baselineCommit: 4cf5d0ff7c5caef33fd34897ba841c262fe72169
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/389'
swimlane: null
diffSummary:
  - file: scripts/upstream-data.mjs
    additions: 21
    deletions: 1
---
Guy's picks for a second batch of Presets tab rows (all default off): hide white/blue gear in maps, cheap div cards, maps below tier N, flasks in maps, cheap uniques in maps, cheap splinter stacks, MS boots while levelling, R-G-B items in maps, 20% quality gems/flasks for the vendor, drop sound volume %, beams/icons for top tiers only, weapons for a build type while levelling (Auto from PoB / Caster / Melee / Bow / Minion).

Skipped by Guy: regal recipe. Deferred: tiered magic/rare drops (3.30 launch day, TODO in presets.ts).

Branch: woke/presets-batch2 (worktree E:\Git\woke-poe-trade-presets2).
