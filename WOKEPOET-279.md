---
id: WOKEPOET-279
title: 'Campaign pill: show the current step''s area hint'
status: Done
priority: Medium
effort: S
assignee: unassigned
tags:
  - campaign
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-14T04:35:55.705Z'
    comment: Created ticket.
    id: a-2026-11-14t04-35-55-705z
  - type: comment
    user: Agent
    comment: >-
      Merged as b98c13b6. The campaign pill shows the step's area hint on a
      second line, and it can be switched off in the settings.
    completionComment: true
    date: '2026-11-14T04:53:53.981Z'
    id: c-2026-11-14t04-53-53-981z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T04:53:54.407Z'
baselineCommit: ae072f60270fa58e9d206c73fab27bd78609319b
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/440'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/loot-filter/compose.ts
    additions: 1
    deletions: 1
  - file: renderer/src/web/woke/loot-filter/store.ts
    additions: 3
    deletions: 14
  - file: renderer/test/woke/filter-flows.test.ts
    additions: 11
    deletions: 0
  - file: renderer/test/woke/filter-price-flows.test.ts
    additions: 6
    deletions: 5
---
> **TL;DR:** The always-on campaign pill shows the step's where-to-go hint ("Usually ↗") as a dimmed readout after the step.

Option A built in PR https://github.com/guybnd/woke-poe-trade/pull/440. Mocks with A/B/C: https://claude.ai/artifact/MQcQW44AsoHTUT2iZpHMUM. Guy's pick is still open: if he picks B or C, rework before merge. Review is clean and checks pass.
