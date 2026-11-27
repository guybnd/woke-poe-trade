---
id: WOKEPOET-204
title: 'PoB J: show picked mastery effects on the tree'
status: Released
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
parentId: WOKEPOET-194
history:
  - type: activity
    user: Agent
    date: '2026-11-11T07:20:00.883Z'
    comment: Created ticket.
    id: a-2026-11-11t07-20-00-883z
  - type: activity
    user: Agent
    date: '2026-11-11T07:20:00.883Z'
    comment: Created as subtask of WOKEPOET-194.
    id: a-2026-11-11t07-20-00-883z
  - type: comment
    user: Agent
    comment: 'PR #330. Reviewed; findings fixed; checks pass.'
    date: '2026-11-11T07:28:50.626Z'
    completionComment: true
    id: c-2026-11-11t07-28-50-626z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-11T07:28:50.626Z'
  - type: comment
    user: Agent
    comment: 'Merged in #330.'
    date: '2026-11-11T08:02:48.346Z'
    completionComment: true
    id: c-2026-11-11t08-02-48-346z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-11T08:02:48.346Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:55.415Z'
needsAction: null
reviewState: null
version: '000054'
releasedAt: '2026-11-27T16:11:53.153Z'
releaseDocPath: release-notes/000054
---
> TL;DR: Guy's #11. Parse Spec masteryEffects; tree data gains masteryEffects (effect id -> stats); tree tooltip, Totals and search use the picked effect. Branch pob-mastery.
