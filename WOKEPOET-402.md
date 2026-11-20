---
id: WOKEPOET-402
title: 'Port upstream rare-only mods (3.30) and review data PR #657'
status: In Progress
priority: None
effort: None
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
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
---
Review of #657 (upstream data v26): no woke entries lost, no stat matchers lost, hashes match, 6 new stats, 3 trade id additions. Clean to merge.

Upstream 803d188d + 38db3e1 (rare-only mods, 9-mod maps) were never ported: Woke reads "Rare-only Prefix/Suffix Modifier" lines with no prefix/suffix, so affix caps miscount. Port in branch woke/rare-only-mods. Non-English strings use one word for both, so generation is only set where the two strings differ.

#656 is a duplicate of merged #654 (every file matches master): close it.
