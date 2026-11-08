---
id: WOKEPOET-150
title: A. Filter editor accepts the item tier condition
status: Ready
priority: High
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:43.222Z'
    comment: Created ticket.
    id: a-2026-11-08t09-53-43-222z
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:43.222Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-08t09-53-43-222z
  - type: activity
    user: Agent
    date: '2026-11-08T10:02:59.433Z'
    comment: >-
      validate.ts already knew UnidentifiedItemTier and never warns on
      source-filter keywords. Added it and WaystoneTier to BARE_KEYS so
      rewritten rules stay unquoted, plus a round-trip test. In PR #266 (branch
      woke/330-league-prep). Matching stays "unknown" until D parses the tier.
    id: a-2026-11-08t10-02-59-433z
  - type: comment
    user: Agent
    comment: >-
      **Item tier conditions round-trip in the filter editor.** In PR
      https://github.com/guybnd/woke-poe-trade/pull/266, with a test. Local
      checks pass. Waiting on the cloud merge.
    date: '2026-11-08T10:03:03.028Z'
    completionComment: true
    id: c-2026-11-08t10-03-03-028z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-08T10:03:03.028Z'
needsAction: null
---
Add the new tier condition (likely `UnidentifiedItemTier`, confirm from 3.30 patch notes / NeverSink 3.30) to `loot-filter/parse.ts`, `validate.ts`, `match.ts` so NeverSink 3.30 filters load without "unknown condition" warnings. Matching returns unknown until the parser knows an item's tier (D). Before launch.
