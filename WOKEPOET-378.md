---
id: WOKEPOET-378
title: 'Fix e2e: unique-base tooltip never appears (item-tip.spec.ts:104)'
status: Released
priority: Medium
effort: None
assignee: unassigned
tags:
  - bug
  - testing
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-18T14:18:55.626Z'
    comment: Created ticket.
    id: a-2026-11-18t14-18-55-626z
  - type: activity
    user: Agent
    date: '2026-11-18T14:34:54.448Z'
    comment: >-
      Cause: Playwright hover() scrolls the side panel to the chip; the scroll
      event (GameTooltip hides on any capture scroll) can land after mouseenter,
      cancelling the pending tip timer. Fix in 255f7540 on woke/facetor-lens (PR
      627): scroll into view, wait two frames, then hover. item-tip.spec.ts
      passed 3/3 locally.
    id: a-2026-11-18t14-34-54-448z
  - type: comment
    user: Agent
    comment: >-
      Test fix (scroll, wait two frames, hover) landed in PR 627.
      item-tip.spec.ts passes locally.
    date: '2026-11-18T14:49:39.174Z'
    completionComment: true
    id: c-2026-11-18t14-49-39-174z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-18T14:49:39.174Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 53ad9b59. The e2e test now scrolls the chip into view and waits
      two frames before hovering. Before, the side panel's late scroll event
      cancelled the tooltip.
    completionComment: true
    date: '2026-11-18T14:49:40.432Z'
    id: c-2026-11-18t14-49-40-432z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T14:49:40.891Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T04:30:56.647Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/627'
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
On master 3c634d10, testing/e2e/item-tip.spec.ts:104 ("a base in a unique tier lists the uniques it can drop as, with their prices") fails locally on every run: hovering the Leather Belt chip in the loot filter's "Items in this tier" list shows no tooltip. Fake-game CI also failed it on PR #627. The cause isn't known yet; the code hasn't changed since #525 (15 Nov), so it may depend on the date or on how old the fixtures are.

Done when: the cause is found and fixed (or the test is fixed if the test itself is wrong), item-tip.spec.ts passes locally, and the branch is handed to the coordinator.
