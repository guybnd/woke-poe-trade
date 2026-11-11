---
id: WOKEPOET-198
title: 'PoB D: gem hover shows where to get it for the build''s class'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-194
history:
  - type: activity
    user: Agent
    date: '2026-11-11T06:41:14.148Z'
    comment: Created ticket.
    id: a-2026-11-11t06-41-14-148z
  - type: activity
    user: Agent
    date: '2026-11-11T06:41:14.148Z'
    comment: Created as subtask of WOKEPOET-194.
    id: a-2026-11-11t06-41-14-148z
  - type: comment
    user: Agent
    comment: >-
      Built in PR #327: gemWhere() in gems.ts, GEM_CLASS provided by
      BuildDetail, GemName uses it as tooltip note. Reward + first vendor for
      the build's class. Tests added. Merge pending.
    date: '2026-11-11T06:51:00.001Z'
    completionComment: true
    id: c-2026-11-11t06-51-00-001z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-11T06:51:00.002Z'
  - type: comment
    user: Agent
    comment: 'Merged in #327.'
    date: '2026-11-11T08:02:45.343Z'
    completionComment: true
    id: c-2026-11-11t08-02-45-343z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-11T08:02:45.343Z'
needsAction: null
reviewState: null
---
> TL;DR: Guy's #4. Every gem hover in the Leveling tab adds the quest reward or vendor + act for the build's class (data the Gems by level list already has).
