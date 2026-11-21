---
id: WOKEPOET-455
title: 'Ctrl+Space search finds settings (Open settings, pages, each setting)'
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - search
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T11:57:44.881Z'
    comment: Created ticket.
    id: a-2026-11-21t11-57-44-881z
  - type: comment
    user: Agent
    comment: >-
      PR 734 reviewed (separate adversarial review, all findings fixed), CI
      green, merged as edb4630f.
    date: '2026-11-21T12:34:48.528Z'
    completionComment: true
    id: c-2026-11-21t12-34-48-528z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T12:34:48.529Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 734 (edb4630f). Ctrl+Space: "settings" lists Open settings +
      every page; a setting's name opens its page and flashes the row. Review
      findings fixed; CI green.
    completionComment: true
    date: '2026-11-21T12:34:58.895Z'
    id: c-2026-11-21t12-34-58-895z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T12:34:59.299Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/734'
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
Guy typed "settings" into Ctrl+Space and got only poewiki/poedb web rows. Settings pages were matched only by their own names and there was no "Open settings" entry.

Fix: "settings" lists Open settings + every page; setting labels (pages' `find` lists, same index as Settings Ctrl+F) jump to their page and flash the row. PR https://github.com/guybnd/woke-poe-trade/pull/734
