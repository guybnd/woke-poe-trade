---
id: WOKEPOET-197
title: 'PoB C: tie the gem and gear set pickers together'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - ui
  - mocks
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-194
history:
  - type: activity
    user: Agent
    date: '2026-11-11T06:41:12.448Z'
    comment: Created ticket.
    id: a-2026-11-11t06-41-12-448z
  - type: activity
    user: Agent
    date: '2026-11-11T06:41:12.448Z'
    comment: Created as subtask of WOKEPOET-194.
    id: a-2026-11-11t06-41-12-448z
  - type: comment
    user: Agent
    comment: >-
      Mocks C1-C3 at https://claude.ai/artifact/HNY4e82bdeByYoJB8AAj6r: which
      set picker? Recommend C1 (one row, link toggle).
    date: '2026-11-11T06:51:04.750Z'
    id: c-2026-11-11t06-51-04-750z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-11T06:51:04.750Z'
    comment: >-
      Mocks C1-C3 at https://claude.ai/artifact/HNY4e82bdeByYoJB8AAj6r: which
      set picker? Recommend C1 (one row, link toggle).
  - type: comment
    user: Agent
    comment: 'Guy picked C1 (one row, link toggle).'
    date: '2026-11-11T07:04:31.526Z'
    id: c-2026-11-11t07-04-31-526z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-11T07:04:31.526Z'
    comment: 'Guy picked C1 (one row, link toggle).'
  - type: comment
    user: Agent
    comment: 'C1 built in PR #331 (link chip, unlinkedSets).'
    date: '2026-11-11T07:28:52.978Z'
    completionComment: true
    id: c-2026-11-11t07-28-52-978z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-11T07:28:52.978Z'
  - type: activity
    user: Agent
    date: '2026-11-11T08:02:40.784Z'
    comment: >-
      Open check from the merge review: in e2e, the campaign dock card (pinned
      by a click) covers the wrapped set chip row. In the real overlay that
      depends on where Guy's panel sits relative to the dock. I couldn't check
      while he was in game. Next time the overlay is open: compare the bounding
      box of [data-w-panel] ._dock_ with the chip row over CDP (127.0.0.1:9333)
      while the campaign card is pinned. If they overlap, fix it in a follow-up
      (dock cards avoid open panels, or the chip row stops wrapping).
    id: a-2026-11-11t08-02-40-784z
  - type: comment
    user: Agent
    comment: 'Merged in #331. The open dock-card overlap check is noted above.'
    date: '2026-11-11T08:02:50.046Z'
    completionComment: true
    id: c-2026-11-11t08-02-50-046z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-11T08:02:50.046Z'
swimlane: null
needsAction: null
reviewState: null
---
> TL;DR: Guy's #3. Picking a gem set should pick the matching gear set (or a toggle decides), maybe shown as one connected list. Mocks first.
