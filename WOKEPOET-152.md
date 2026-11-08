---
id: WOKEPOET-152
title: 'C. Mocks: item tier in filter rules and price check'
status: Done
priority: Medium
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
    date: '2026-11-08T09:53:46.637Z'
    comment: Created ticket.
    id: a-2026-11-08t09-53-46-637z
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:46.637Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-08t09-53-46-637z
  - type: comment
    user: Agent
    comment: >-
      Mocks are up: https://claude.ai/artifact/XR9H8kNY9NnKJiE6hFmR5F. **Pick
      one for price check (A chip, B pips, C tier row with hint) and one for
      filter rules (D number row, E five tier buttons), plus yes/no on F (a
      strictness row that hides magic and rare items below a tier).** My
      recommendation: A + E + F.
    date: '2026-11-08T10:02:57.630Z'
    id: c-2026-11-08t10-02-57-630z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-08T10:02:57.630Z'
    comment: >-
      Mocks are up: https://claude.ai/artifact/XR9H8kNY9NnKJiE6hFmR5F. **Pick
      one for price check (A chip, B pips, C tier row with hint) and one for
      filter rules (D number row, E five tier buttons), plus yes/no on F (a
      strictness row that hides magic and rare items below a tier).** My
      recommendation: A + E + F.
  - type: comment
    user: Agent
    comment: >-
      Guy picked A (tier chip by the name in price check) and E (T1-T5 buttons
      in filter rules). No F.
    date: '2026-11-08T15:12:16.795Z'
    id: c-2026-11-08t15-12-16-795z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-08T15:12:16.795Z'
    comment: >-
      Guy picked A (tier chip by the name in price check) and E (T1-T5 buttons
      in filter rules). No F.
  - type: comment
    user: Agent
    comment: >-
      **Mocks done, and Guy picked A and E.** E is being built in WOKEPOET-159
      (PR #273). A is folded into WOKEPOET-153, which waits on a launch-day item
      copy.
    date: '2026-11-08T15:12:35.307Z'
    completionComment: true
    id: c-2026-11-08t15-12-35-307z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-08T15:12:35.307Z'
  - type: comment
    user: Agent
    comment: 'Guy picked A and E. E shipped in #273. A continues in WOKEPOET-153.'
    completionComment: true
    date: '2026-11-08T15:21:05.632Z'
    id: c-2026-11-08t15-21-05-632z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-08T15:21:05.870Z'
swimlane: null
needsAction: null
baselineCommit: e67d6ec4dad47efdb249e0afdf27705a03528309
implementationLink: 'https://claude.ai/artifact/XR9H8kNY9NnKJiE6hFmR5F'
diffSummary:
  - file: renderer/src/web/woke/loot-filter/RuleBuilder.vue
    additions: 11
    deletions: 1
  - file: renderer/src/web/woke/loot-filter/rules.ts
    additions: 20
    deletions: 3
  - file: renderer/test/woke/filter-rules.test.ts
    additions: 12
    deletions: 1
---
Options for showing tier 1-5 on items: filter RuleBuilder control, strictness rows, price check badge. Guy picks before D builds it.
