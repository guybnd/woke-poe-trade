---
id: WOKEPOET-571
title: Redesign the map price check layout
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T12:37:42.558Z'
    comment: Created ticket.
    id: a-2026-11-24t12-37-42-558z
  - type: comment
    user: Agent
    comment: >-
      Option A is being built. Guy's pick is open:
      https://claude.ai/artifact/TExU6zD7xDMjbVj7CPQ47a
    date: '2026-11-24T12:37:47.876Z'
    selfAttested: true
    id: c-2026-11-24t12-37-47-876z
  - type: activity
    user: Agent
    date: '2026-11-24T13:00:43.108Z'
    comment: Updated implementation link.
    id: a-2026-11-24t13-00-43-108z
  - type: comment
    user: Agent
    comment: >-
      Phase A+K shipped in PR 880 (merged ee731ea). Farming templates next;
      ticket stays In Progress.
    date: '2026-11-24T13:57:29.718Z'
    selfAttested: true
    pin: true
    id: c-2026-11-24t13-57-29-718z
  - type: comment
    user: Agent
    comment: >-
      PR 885 (https://github.com/guybnd/woke-poe-trade/pull/885, merged
      554a957): map strip + a "+" tile that adds a number the map hasn't got.
    date: '2026-11-24T14:52:07.187Z'
    selfAttested: true
    id: c-2026-11-24t14-52-07-187z
  - type: comment
    user: Agent
    comment: >-
      Farming templates shipped in PR 902
      (https://github.com/guybnd/woke-poe-trade/pull/902, merged d871894): save
      your own Farming buttons. Redesign PRs: 880, 885, 891, 896, 902.
    date: '2026-11-25T03:21:34.472Z'
    selfAttested: true
    id: c-2026-11-25t03-21-34-472z
  - type: comment
    user: Agent
    comment: Farming templates merged in PR 902; redesign complete.
    date: '2026-11-25T03:21:35.503Z'
    completionComment: true
    id: c-2026-11-25t03-21-35-503z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-25T03:21:35.503Z'
  - type: comment
    user: Agent
    comment: >-
      Final phase (farming templates) merged at d871894; dev build reloaded.
      Guy's layout pick mockup remains linked in notes.
    completionComment: true
    date: '2026-11-25T03:21:40.543Z'
    id: c-2026-11-25t03-21-40-543z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-25T03:21:41.083Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/902'
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
Redesign the price check layout for maps. No PR yet.
