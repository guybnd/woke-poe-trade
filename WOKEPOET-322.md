---
id: WOKEPOET-322
title: 'Loot filter Rules: ladder view (bands, border marks, specials)'
status: Ready
priority: None
effort: M
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T11:31:34.640Z'
    comment: Created ticket.
    id: a-2026-11-15t11-31-34-640z
  - type: comment
    user: Agent
    comment: >-
      Built as PR #525 (branch woke/filter-rule-columns), from Guy's pick A.
      Unit tests, types, lint, build, perf budgets and the e2e ladder test all
      pass. The `stack sizes` e2e test also fails on master, so that failure
      isn't from this PR. The adversarial review fixes are in. It's with the
      merge thread now; finish once it merges.
    date: '2026-11-15T11:31:42.578Z'
    completionComment: true
    id: c-2026-11-15t11-31-42-578z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T11:31:42.578Z'
needsAction: null
---
Guy found the Rules tab's middle table hard to read: conditions were cut off, the preview column was cramped, and the Deco border rules sat among the real tiers. He asked for one generic editor for every group.

Mockups: https://claude.ai/artifact/RExR9CGBJ9Rcvx7BvnR2mG. Guy picked A, the ladder.

Built in PR https://github.com/guybnd/woke-poe-trade/pull/525:
- tiers in order, with look-alike tiers folded into bands
- `Continue` rules shown as mark chips
- specials and sub-group links
- a hidden-below line and a Shown/Hidden button per row

Local checks and the adversarial review are done. It's waiting on the merge thread.
