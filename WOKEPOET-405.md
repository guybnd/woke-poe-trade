---
id: WOKEPOET-405
title: Price check new 3.30 Exalted Orbs as currency; currency-aware new-item note
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T03:23:56.108Z'
    comment: Created ticket.
    id: a-2026-11-20t03-23-56-108z
  - type: activity
    user: Agent
    date: '2026-11-20T03:24:44.953Z'
    comment: Updated implementation link.
    id: a-2026-11-20t03-24-44-953z
  - type: comment
    user: Agent
    comment: 'PR #665 reviewed, local checks pass, merged as 1e63e2e7.'
    date: '2026-11-20T03:33:23.979Z'
    completionComment: true
    id: c-2026-11-20t03-33-23-979z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-20T03:33:23.979Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 1e63e2e7: Primordial and Originator's Exalted Orbs in item data
      (v26) with trade tags; new-item note no longer promises mod filters for
      currency, cards and gems.
    completionComment: true
    date: '2026-11-20T03:33:28.486Z'
    id: c-2026-11-20t03-33-28-486z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-20T03:33:29.026Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/665'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
Guy's screenshot: Primordial Exalted Orb price check showed the new-item fallback ("Mod filters come with the next item data update") with 2 listings.

- Not in item data on master, and not in upstream data v26 (#657) either.
- Trade-site diff (`scripts/trade-data-patch.mjs check`) shows only two new 3.30 exchange items missing: Primordial Exalted Orb and Originator's Exalted Orb. Added both as ITEM with tradeTag (bulk exchange + poe.ninja + Ctrl+Space).
- New-item fallback note now depends on kind: currency/cards say bulk prices come with the next data update, gems say level/quality filters; only gear says mod filters.
- Also reported by check (not in this change): 6 new stats, 12 new ids, 3 rewordings.
