---
id: WOKEPOET-287
title: Open in PoB opens Path of Building directly
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-15T05:18:47.178Z'
    comment: Created ticket.
    id: a-2026-11-15t05-18-47-178z
  - type: comment
    user: Agent
    comment: 'Merged as #491 (472c1b79), and Guy confirmed it works in game.'
    date: '2026-11-15T05:18:51.476Z'
    completionComment: true
    id: c-2026-11-15t05-18-51-476z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-15T05:18:51.476Z'
  - type: comment
    user: Agent
    comment: >-
      Open in PoB finds Path of Building, points its Settings.xml at the build,
      and starts it. Merged as #491, and Guy confirmed it works.
    completionComment: true
    date: '2026-11-15T05:18:57.416Z'
    id: c-2026-11-15t05-18-57-416z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-15T05:18:57.715Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/491'
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
> **TL;DR:** "Open in PoB" brought up Windows' app picker. It now starts PoB on the build. Merged as #491, and Guy confirmed it works.

PoB's command line only takes pob:// site links, so the button now points `<Mode>` in PoB's Settings.xml at the build and starts PoB with no arguments. Without PoB, the file is shown in Explorer.
