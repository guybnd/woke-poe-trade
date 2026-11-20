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
---
Review of #657 (upstream data v26): no woke entries lost, no stat matchers lost, hashes match, 6 new stats, 3 trade id additions. Clean to merge.

Upstream 803d188d + 38db3e1 (rare-only mods, 9-mod maps) were never ported: Woke reads "Rare-only Prefix/Suffix Modifier" lines with no prefix/suffix, so affix caps miscount. Port in branch woke/rare-only-mods. Non-English strings use one word for both, so generation is only set where the two strings differ.

#656 is a duplicate of merged #654 (every file matches master): close it.
