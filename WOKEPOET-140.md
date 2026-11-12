---
id: WOKEPOET-140
title: History rows show wrong item tooltip (base instead of unique)
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-06T09:00:25.352Z'
    comment: Created ticket.
    id: a-2026-11-06t09-00-25-352z
  - type: activity
    user: Agent
    date: '2026-11-06T09:04:48.591Z'
    comment: Updated implementation link.
    id: a-2026-11-06t09-04-48-591z
  - type: activity
    user: Agent
    date: '2026-11-06T09:04:49.657Z'
    comment: >-
      Cause: whispers write "Name, Base"; the comma stopped the unique matching,
      so the tooltip used the rare fallback (Windscream, Reinforced Greaves
      showed the base). PR #235 awaiting merge through the cloud route.
    id: a-2026-11-06t09-04-49-657z
  - type: activity
    user: Agent
    date: '2026-11-06T09:12:49.810Z'
    comment: Updated description.
    id: a-2026-11-06t09-12-49-810z
  - type: comment
    user: Agent
    comment: >-
      Merged as ab1dbd3 and live on the dev copy (dev-230-with-master @
      9b4a0d80). Verified through the lookup on the live overlay; not hovered in
      game.
    date: '2026-11-06T09:12:50.863Z'
    completionComment: true
    id: c-2026-11-06t09-12-50-863z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-06T09:12:50.863Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:17:17.415Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/235'
needsAction: null
reviewState: null
---
Hovering a row in the trade card's History (Windscream, Le Heup of All, Praxis) showed a base item's tooltip, such as Reinforced Greaves, instead of the unique.

Cause: whispers write "Name, Base", and the comma stopped `itemRefFromText` matching the unique, so it used the rare fallback.

Fix: PR #235, merged as ab1dbd3.

## Acceptance criteria
- [x] "Windscream, Reinforced Greaves" resolves to Windscream on the live overlay
- [x] Rares with a comma still resolve to their base
- [x] Unit test fails without the fix
