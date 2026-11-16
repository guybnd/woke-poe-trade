---
id: WOKEPOET-343
title: 'Price check: timeless jewel mods not recognized in 3.30'
status: Ready
priority: High
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-16T15:10:32.865Z'
    comment: Created ticket.
    id: a-2026-11-16t15-10-32-865z
  - type: activity
    user: Agent
    date: '2026-11-16T15:11:04.442Z'
    comment: Updated implementation link.
    id: a-2026-11-16t15-11-04-442z
  - type: comment
    user: Agent
    comment: >-
      PR #560: plain-text fallback in stat matcher index (both builders). The
      adversarial review found no bugs: lookups for existing matchers are
      unchanged in all 4 languages. Tests (4291), lint and build pass. Handed to
      the coordinator for merge.
    date: '2026-11-16T15:15:17.693Z'
    completionComment: true
    id: c-2026-11-16t15-15-17-693z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-16T15:15:17.693Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/560'
needsAction: null
---
> **TL;DR** Every timeless jewel's seed + conqueror lines showed "Not recognized modifier" in price check. The stat index only held the advanced form ("…Asenath(Asenath-Nasima)"), which 3.30 copy text drops. Fix indexes the plain text too. Branch woke/timeless-jewel-mods.

Reported from a Brutal Restraint screenshot. Covers all 6 jewels (18 stats), with tests and a 3.30 fixture.
