---
id: WOKEPOET-453
title: 'Gate: every line item has the item hover tooltip'
status: Released
priority: High
effort: None
assignee: unassigned
tags:
  - testing
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-21T11:21:47.559Z'
    comment: Created ticket.
    id: a-2026-11-21t11-21-47-559z
  - type: activity
    user: Agent
    date: '2026-11-21T11:57:38.396Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/733 open: e2e tip audit +
      static rule + gap fixes; adversarial review done and fixed; waiting on CI.
    id: a-2026-11-21t11-57-38-396z
  - type: comment
    user: Agent
    comment: >-
      PR 733 merged after two adversarial reviews and green CI: e2e item-tooltip
      gate in every fake-game test, static rule test, ~25 gaps fixed, rule in
      CLAUDE.md.
    date: '2026-11-21T12:21:46.196Z'
    completionComment: true
    id: c-2026-11-21t12-21-46-196z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T12:21:46.196Z'
  - type: comment
    user: Agent
    comment: >-
      Merged. Every fake-game test now fails if an item name shows without the
      item tooltip (testing/e2e/tip-audit.ts); static rule test; rule in
      CLAUDE.md and UI README. Fixed ~25 gaps; exemptions need
      data-no-item-tip="why". v-item-tip moved to page-level hover delegation
      (listeners 2224 → 2149). Open: mod rows not auto-detected.
    completionComment: true
    date: '2026-11-21T12:21:58.327Z'
    id: c-2026-11-21t12-21-58-327z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T12:21:58.754Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:50:57.619Z'
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/733'
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
version: '0001'
releasedAt: '2026-11-25T11:50:45.359Z'
releaseDocPath: release-notes/0001
---
Guy's standing rule: every row that names an item, mod, sale or listing has a proper hover tooltip (the standard item hover for items). Build an automated gate so it can't slip: e2e audit in the fake-game harness (testing/e2e/tip-audit.ts), v-item-tip marks its element, fix real gaps, document in CLAUDE.md / ui README.
