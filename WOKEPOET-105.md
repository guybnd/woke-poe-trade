---
id: WOKEPOET-105
title: >-
  Unknown items fall back to raw text and a trade link; clients in other
  languages
status: Done
priority: Medium
effort: M
assignee: unassigned
tags:
  - feature
  - overlay-core
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-36
history:
  - type: activity
    user: Agent
    date: '2026-11-05T13:19:45.665Z'
    comment: Created ticket.
    id: a-2026-11-05t13-19-45-665z
  - type: activity
    user: Agent
    date: '2026-11-05T13:19:45.665Z'
    comment: Created as subtask of WOKEPOET-36.
    id: a-2026-11-05t13-19-45-665z
  - type: comment
    user: Agent
    comment: >-
      Merged as #368 (97c40783): an item price check can't read offers Copy text
      and a trade search by name (Guy's A). The non-English client note is in
      #371.
    date: '2026-11-12T07:48:43.049Z'
    completionComment: true
    id: c-2026-11-12t07-48-43-049z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T07:48:43.049Z'
needsAction: null
---
> **TL;DR** Split from WOKEPOET-51. A parse failure on an unknown item is a dead end; show raw text and a trade link instead. Handle game clients in languages the app recognises but doesn't offer (detector has 10, the app 4). A league that adds new item text labels still needs a release, since `client_strings.js` isn't downloaded. Any new UI needs mocks first.
