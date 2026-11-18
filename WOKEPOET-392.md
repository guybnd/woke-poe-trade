---
id: WOKEPOET-392
title: 'Loot filter bug hunt: group hide fixes and cluster price fallback'
status: Done
priority: High
effort: S
assignee: unassigned
tags:
  - bug
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:35:01.011Z'
    comment: Created ticket.
    id: a-2026-11-18t15-35-01-011z
  - type: comment
    user: Agent
    comment: >-
      Merged as PR 633 (12cea9e6): group hide fixes and cluster price fallback,
      with review follow-ups.
    date: '2026-11-18T16:02:43.220Z'
    completionComment: true
    id: c-2026-11-18t16-02-43-220z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-18T16:02:43.220Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as PR 633 (12cea9e6). Hide whole group now hides only that group. A
      shown tier of a hidden group gets its sound, beam and icon back. Cluster
      price rules with no usable price keep NeverSink's list. The remaining
      fixes come next on woke/filter-bughunt-2.
    completionComment: true
    date: '2026-11-18T16:02:44.876Z'
    id: c-2026-11-18t16-02-44-876z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-18T16:02:45.253Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/633'
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
Bug hunt team 2 (2026-11-19). Already done on branch `woke/filter-bughunt` (13c5358d, 2c4022b9) and sent to merge.

Fixed:
1. "Hide whole group" matched child types by prefix: Currency also hid 24 groups (Omens, Fossils, Essences, Oils, Splinters, Harvest...); Uniques hid Replicas and Foulborn. Now the exact $type only.
2. Group hide, then Show one tier, left that tier with no sound, beam or map icon. The same happened to own rules copied from that tier. They now come back, but a sound or beam you removed on purpose stays off. Minimal stays quiet.
3. Cluster price rules with no usable poe.ninja price were commented out. They now keep NeverSink's list.

Open, waiting on Guy: boss-only uniques left out of the safety net and price tiers (#616). Not fixed (smaller): unknown base or class saves, Alt+F card keys work window-wide, share "Add" doesn't fold, stacks stay dismissed, low-maps fallback look.
