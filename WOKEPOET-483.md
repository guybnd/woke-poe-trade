---
id: WOKEPOET-483
title: >-
  Net worth: one-day poe.ninja fake (The Web 28,886c) slipped past the thin-jump
  guard
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-22T14:38:37.929Z'
    comment: Created ticket.
    id: a-2026-11-22t14-38-37-929z
  - type: comment
    user: Agent
    comment: >-
      PR 769 merged: last solid price kept, one-day stackable fakes not counted.
      Review fixes in, CI green.
    date: '2026-11-22T14:50:24.472Z'
    completionComment: true
    id: c-2026-11-22t14-50-24-472z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T14:50:24.472Z'
  - type: comment
    user: Agent
    comment: >-
      Baseline keeps the last solid poe.ninja price through unpriced reads; a
      stackable priced only today at 10c+ doesn't count while 5x over it (or
      with none) until poe.ninja has a second day. Gear left to the 6h jump
      rule. Open: a one-day fake that lasts into a second day on an item with no
      solid price counts from then.
    completionComment: true
    date: '2026-11-22T14:50:29.045Z'
    id: c-2026-11-22t14-50-29-045z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T14:50:29.750Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/769'
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
Follow-up to WOKEPOET-473. The Web dropped off poe.ninja for about 8h, so the baseline forgot its 2.25c price. It came back at 28,886c (gaps 6), and the guard had no reference. Fix: the baseline keeps `ref` (the last solid price), and a one-day price of 10c or more doesn't count while it's 5x or more over ref, or there's no ref, until poe.ninja has a second day.
