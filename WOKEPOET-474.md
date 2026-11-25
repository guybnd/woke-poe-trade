---
id: WOKEPOET-474
title: 'Price check: Kitava''s Thirst trigger line searches 125 instead of 50%'
status: Released
priority: High
effort: None
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Guy
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
  - type: comment
    user: Agent
    comment: PR 756 merged after adversarial review and green checks.
    date: '2026-11-22T08:05:16.565Z'
    completionComment: true
    id: c-2026-11-22t08-05-16-565z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T08:05:16.565Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 756. Kitava's Thirst (Mana and Foulborn Life), Tinkerskin's
      Phasing and Deerstalker's Movement Speed lines search their percentage
      (verified on trade API) in every client language; PoE mode shows both
      numbers. Guard test lists every one-percentage two-number stat across
      languages (idols' Possessed line verified as average). 0% BASE verified
      against trade base percentile filter. Standard mode row text still shows
      one number (startup JS budget).
    completionComment: true
    date: '2026-11-22T08:05:25.263Z'
    id: c-2026-11-22t08-05-25-263z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T08:05:25.665Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:54.502Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/756'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
Foulborn Kitava's Thirst "50% chance to Trigger Socketed Spells when you Spend at least 200 Life..." averaged both numbers (125) and the search found no listings. Trade site stores this stat (and plain Kitava's, Tinkerskin's Phasing, Deerstalker's Movement Speed) by the first number — verified on the live trade API. Death's Oath verified as average, so a whitelist. Guy also asked to check other trigger mods: swept all unique trigger lines; guard test fails on any new unchecked two-number trigger stat. 0% BASE chip checked against trade base percentile filter: correct.
