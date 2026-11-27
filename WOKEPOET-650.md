---
id: WOKEPOET-650
title: Watcher's Eye finder
status: Released
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
    date: '2026-11-27T04:10:47.853Z'
    comment: Created ticket.
    id: a-2026-11-27t04-10-47-853z
  - type: activity
    user: Agent
    date: '2026-11-27T04:10:51.274Z'
    comment: Updated implementation link.
    id: a-2026-11-27t04-10-51-274z
  - type: comment
    user: Agent
    comment: >-
      Guy's picks (A1 picked; type-to-pick aura box and saved setups built):
      https://claude.ai/artifact/DxKeV6pSyLcWDAVum6Tc6r
    date: '2026-11-27T04:10:52.619Z'
    selfAttested: true
    pin: true
    id: c-2026-11-27t04-10-52-619z
  - type: comment
    user: Agent
    comment: PR 979 merged (a23e1a8).
    date: '2026-11-27T04:23:00.874Z'
    completionComment: true
    id: c-2026-11-27t04-23-00-874z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-27T04:23:00.874Z'
  - type: comment
    user: Agent
    comment: Merged at a23e1a8; dev build reloaded.
    completionComment: true
    date: '2026-11-27T04:23:06.743Z'
    id: c-2026-11-27t04-23-06-743z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-27T04:23:07.495Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:50.395Z'
  - type: comment
    user: Agent
    comment: >-
      Follow-up PR 984 (https://github.com/guybnd/woke-poe-trade/pull/984,
      7cf88ae): jewel art icon, At least 1/2/3 match toggles (Guy: more than 3
      picked defaults to "at least 3").
    date: '2026-11-27T05:34:48.697Z'
    selfAttested: true
    id: c-2026-11-27t05-34-48-697z
  - type: comment
    user: Agent
    comment: >-
      Bug fix PR 992 (https://github.com/guybnd/woke-poe-trade/pull/992,
      7ee61a8): Save always keeps the setup. Guy's earlier saved template was
      never written (saved[] empty in every config backup from 04:23Z on); he'll
      need to save it again.
    date: '2026-11-27T07:24:45.183Z'
    selfAttested: true
    id: c-2026-11-27t07-24-45-183z
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/979'
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
version: '0003'
releasedAt: '2026-11-27T04:30:50.393Z'
releaseDocPath: release-notes/0003
---
Watcher's Eye finder: a type-to-pick aura box and saved setups. PR: https://github.com/guybnd/woke-poe-trade/pull/979
