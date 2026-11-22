---
id: WOKEPOET-469
title: Item tooltips draw behind long-used windows (Net worth)
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
    date: '2026-11-22T05:06:51.422Z'
    comment: Created ticket.
    id: a-2026-11-22t05-06-51-422z
  - type: comment
    user: Agent
    comment: >-
      Merged in PR 750: panel z-orders renumber from 101 once past 800, so
      windows stay under the item tooltip. Hover e2e checks paint order now.
    date: '2026-11-22T05:17:04.367Z'
    completionComment: true
    id: c-2026-11-22t05-17-04-367z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-22T05:17:04.367Z'
  - type: comment
    user: Agent
    comment: >-
      Panel z-orders renumber from 101 once any passes 800 (bring-to-front and
      config load), so windows stay under the item tooltip, menus, toasts and
      dock. Hover e2e now asserts the tooltip is painted on top; new test boots
      a panel at 1004.
    completionComment: true
    date: '2026-11-22T05:17:10.610Z'
    id: c-2026-11-22t05-17-10-610z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-22T05:17:11.196Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/750'
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
Net worth rows showed no item tooltip or one half hidden behind the window. Panel wmZorder grew by one per bring-to-front forever; Net worth reached z 1004 over the tooltip's 1000. Fix: renumber z-orders once past 800 (bring-to-front and config load). Gate gap: tip-audit checked wiring, not paint order; the hover e2e now checks the tooltip is topmost. PR https://github.com/guybnd/woke-poe-trade/pull/750
