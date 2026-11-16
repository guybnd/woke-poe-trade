---
id: WOKEPOET-343
title: 'Price check: timeless jewel mods not recognized in 3.30'
status: Done
priority: High
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-16T15:10:32.865Z'
    comment: Created ticket.
    id: a-2026-11-16t15-10-32-865z
  - type: activity
    user: Agent
    date: '2026-11-16T15:11:04.442Z'
    comment: Updated implementation link.
    id: a-2026-11-16t15-11-04-442z
  - type: comment
    user: Agent
    comment: >-
      PR #560: plain-text fallback in stat matcher index (both builders). The
      adversarial review found no bugs: lookups for existing matchers are
      unchanged in all 4 languages. Tests (4291), lint and build pass. Handed to
      the coordinator for merge.
    date: '2026-11-16T15:15:17.693Z'
    completionComment: true
    id: c-2026-11-16t15-15-17-693z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-16T15:15:17.693Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 42b1083a. The stat index now also matches plain text, so the
      3.30 copy of all 6 timeless jewels parses. The dev build is reloaded on
      master.
    completionComment: true
    date: '2026-11-16T15:25:17.202Z'
    id: c-2026-11-16t15-25-17-202z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-16T15:25:17.495Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/560'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
> **TL;DR** Every timeless jewel's seed + conqueror lines showed "Not recognized modifier" in price check. The stat index only held the advanced form ("…Asenath(Asenath-Nasima)"), which 3.30 copy text drops. Fix indexes the plain text too. Branch woke/timeless-jewel-mods.

Reported from a Brutal Restraint screenshot. Covers all 6 jewels (18 stats), with tests and a 3.30 fixture.
