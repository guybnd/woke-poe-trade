---
id: WOKEPOET-724
title: 'Loot filter: unique 6-links at least Big, not Tink'
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-28T10:27:54.461Z'
    comment: Created ticket.
    id: a-2026-11-28t10-27-54-461z
  - type: activity
    user: Agent
    date: '2026-11-28T10:33:22.326Z'
    comment: >-
      Guy picked B (own look, Tabula too). PR
      https://github.com/guybnd/woke-poe-trade/pull/1099, review fixes in.
      Waiting on CI.
    id: a-2026-11-28t10-33-22-326z
  - type: comment
    user: Agent
    comment: >-
      Merged as PR 1099: 6-links section with its own look, Tabula included, at
      Big loudness and never Tink unless the base itself is worth Tink.
    date: '2026-11-28T10:38:42.710Z'
    completionComment: true
    id: c-2026-11-28t10-38-42-710z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T10:38:42.710Z'
  - type: comment
    user: Agent
    comment: >-
      6-linked uniques (Tabula too) get a 6-links section with their own look
      (white on unique brown, white beam and star) at Big loudness, priced at 20
      Fusings; a base worth Tink unlinked keeps Tink. Guy's pick B.
    completionComment: true
    date: '2026-11-28T10:38:47.648Z'
    id: c-2026-11-28t10-38-47-648z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T10:38:48.305Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1099'
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
Guy: "any unique 6link should not be tink but either its own thing or a bigge[r]". "Any unique, 6-link" was priced at the best 6-linked unique on poe.ninja, so every 6-linked unique showed Tink. Building A (20 Fusings, floor Big, bases worth more keep their step) on branch woke/unique-6link. Pick page (A Big / B own look): https://claude.ai/artifact/RqrQEfxnnAZXtWTw2PaLgx
