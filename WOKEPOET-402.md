---
id: WOKEPOET-402
title: 'Port upstream rare-only mods (3.30) and review data PR #657'
status: Released
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-20T01:02:51.055Z'
    comment: Created ticket.
    id: a-2026-11-20t01-02-51-055z
  - type: activity
    user: Agent
    date: '2026-11-20T01:28:22.260Z'
    comment: >-
      #660 (rare-only mods port + review fixes + startup JS win) merged as
      41e639cf. Ticket stays open until #657 (data v26) merges; it waits on
      Guy's workflow approval. #656 still to close (duplicate of #654).
    id: a-2026-11-20t01-28-22-260z
  - type: activity
    user: Agent
    date: '2026-11-20T03:34:00.618Z'
    comment: >-
      Re-reviewed #657 rebuilt as data v27 (49b14701, on master): hashes match,
      nothing dropped (Exalted Orbs from #665, Facetor's Lens, beasts, scarabs
      kept), no stat refs or matchers lost. Go given to merge thread.
    id: a-2026-11-20t03-34-00-618z
  - type: comment
    user: Agent
    comment: >-
      #660 merged as 41e639cf (rare-only mods) and #657 merged as 67e5f628
      (upstream data v27).
    date: '2026-11-20T03:38:12.171Z'
    completionComment: true
    id: c-2026-11-20t03-38-12-171z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T03:38:12.171Z'
  - type: comment
    user: Agent
    comment: >-
      #657 (upstream item data, v27) merged as 67e5f628 after two independent
      reviews. It drops none of Woke's entries and the hashes match. #660 (3.30
      rare-only mods read as prefix or suffix, plus the review fixes and a
      startup JS win) merged as 41e639cf. #656 duplicates #654 and still needs
      closing on GitHub.
    completionComment: true
    date: '2026-11-20T03:38:17.466Z'
    id: c-2026-11-20t03-38-17-466z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T03:38:18.043Z'
  - type: activity
    user: Agent
    date: '2026-11-20T03:38:29.752Z'
    comment: 'Correction: #656 is already closed on GitHub.'
    id: a-2026-11-20t03-38-29-752z
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T11:52:49.109Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: >-
  https://github.com/guybnd/woke-poe-trade/pull/657,
  https://github.com/guybnd/woke-poe-trade/pull/660
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
version: '00002'
releasedAt: '2026-11-25T11:52:41.308Z'
releaseDocPath: release-notes/00002
---
Review of #657 (upstream data v26): no woke entries lost, no stat matchers lost, hashes match, 6 new stats, 3 trade id additions. Clean to merge.

Upstream 803d188d + 38db3e1 (rare-only mods, 9-mod maps) were never ported: Woke reads "Rare-only Prefix/Suffix Modifier" lines with no prefix/suffix, so affix caps miscount. Port in branch woke/rare-only-mods. Non-English strings use one word for both, so generation is only set where the two strings differ.

#656 is a duplicate of merged #654 (every file matches master): close it.
