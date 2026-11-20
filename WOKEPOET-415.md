---
id: WOKEPOET-415
title: 'Bestiary: show each beast''s group and family'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T11:42:09.338Z'
    comment: Created ticket.
    id: a-2026-11-20t11-42-09-338z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-20T11:42:11.664Z'
  - type: activity
    user: Agent
    date: '2026-11-20T11:42:22.151Z'
    comment: >-
      Mocks A/B/C posted in the project thread (artifact
      CYY8UMvvsoVRVEiMQ8Rnz8), A built on woke/beast-type; checks running on
      GitHub.
    id: a-2026-11-20t11-42-22-151z
  - type: activity
    user: Agent
    date: '2026-11-20T11:48:33.152Z'
    comment: >-
      PR #677 open (https://github.com/guybnd/woke-poe-trade/pull/677). Cloud
      checks green, bug review clean. Sent to the merge thread through the
      coordinator. Guy's A/B/C pick is still open.
    id: a-2026-11-20t11-48-33-152z
  - type: comment
    user: Agent
    comment: >-
      Merged as #677 (9fa772f1): Bestiary rows and the Ctrl+Space beast page
      show group · family. The dock-card tag stays on one line. The dev build is
      on 9fa772f1.
    date: '2026-11-20T11:56:10.215Z'
    completionComment: true
    id: c-2026-11-20t11-56-10-215z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T11:56:10.215Z'
  - type: comment
    user: Agent
    comment: >-
      Live on master as 9fa772f1 (#677). Layout A is built; Guy's A/B/C pick is
      still open (mocks: https://claude.ai/artifact/CYY8UMvvsoVRVEiMQ8Rnz8).
    completionComment: true
    date: '2026-11-20T11:56:13.740Z'
    id: c-2026-11-20t11-56-13-740z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T11:56:14.240Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/677'
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
> **TL;DR** Captured beast rows (League Mechanics Bestiary list, Ctrl+Space beast page) show the beast's Bestiary group and family, e.g. "Amphibian · Deep", so Guy knows which to prefer while hunting.

- Data: poedb monster pages (game data) for all 221 CAPTURED_BEAST items; group → family is one-to-one. Genus left out: poedb's genus field disagrees with the wiki's.
- Mocks A/B/C: https://claude.ai/artifact/CYY8UMvvsoVRVEiMQ8Rnz8 (A built, awaiting Guy's pick).
- Branch woke/beast-type, worktree E:\Git\woke\wt\beast-type.
