---
id: WOKEPOET-524
title: 'Net worth tab picker: bigger text, tab colour on each row'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-24T01:56:34.294Z'
    comment: Created ticket.
    id: a-2026-11-24t01-56-34-294z
  - type: activity
    user: Agent
    date: '2026-11-24T01:59:25.815Z'
    comment: >-
      Options page (pick pending from Guy):
      https://claude.ai/artifact/UL95yqx117TYRmXxshzmrD . Building B in PR
      https://github.com/guybnd/woke-poe-trade/pull/827
    id: a-2026-11-24t01-59-25-815z
  - type: comment
    user: Agent
    comment: 'PR 827 merged (option B). Reviewed, CI green.'
    date: '2026-11-24T02:05:24.679Z'
    completionComment: true
    id: c-2026-11-24t02-05-24-679z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-24T02:05:24.679Z'
  - type: comment
    user: Agent
    comment: >-
      Option B merged: rows at --w-fs-md, brighter names, 4px left edge in tab
      colour. Guy's pick on the options page still open; A/C/D are easy swaps.
    completionComment: true
    date: '2026-11-24T02:05:31.416Z'
    id: c-2026-11-24t02-05-31-416z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T02:05:31.777Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/827'
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
User feedback: Holdings "Tabs to read" list text too small, wants rows coloured by tab colour. Mockups (size only / coloured edge / coloured name / full-row tint) for Guy to pick; build size + contrast + thick left edge in tab colour meanwhile.
