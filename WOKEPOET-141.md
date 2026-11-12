---
id: WOKEPOET-141
title: 'History rows: Reopen on hover and a dismiss that removes the row'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-06T09:03:45.494Z'
    comment: Created ticket.
    id: a-2026-11-06t09-03-45-494z
  - type: activity
    user: Agent
    date: '2026-11-06T09:05:52.641Z'
    comment: Updated description.
    id: a-2026-11-06t09-05-52-641z
  - type: comment
    user: Agent
    comment: >-
      Which History row layout: A, B or C? Mocks:
      https://claude.ai/artifact/J2d63jbZGnic74kadKWzrB (A recommended)
    date: '2026-11-06T09:06:08.727Z'
    id: c-2026-11-06t09-06-08-727z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-06T09:06:08.727Z'
    comment: >-
      Which History row layout: A, B or C? Mocks:
      https://claude.ai/artifact/J2d63jbZGnic74kadKWzrB (A recommended)
  - type: activity
    user: Agent
    date: '2026-11-06T09:51:59.839Z'
    comment: Updated implementation link.
    id: a-2026-11-06t09-51-59-839z
  - type: comment
    user: Agent
    comment: >-
      Merged as 45b91e4 (#239), live on the dev copy (dev-230-with-master @
      a5a19c16). Not tried in game.
    date: '2026-11-06T10:00:42.018Z'
    completionComment: true
    id: c-2026-11-06t10-00-42-018z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-06T10:00:42.018Z'
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-06T10:00:42.018Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:17:17.975Z'
swimlane: null
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/239'
reviewState: null
---
Guy: show Reopen only on row hover, and add a dismiss that removes the row completely. Mocks first; waiting on his pick of A, B or C.

## Plan
- OfferRow: closed rows get a hover slot with the age at rest, Reopen and remove on hover.
- Remove: drop the row with an Undo toast, then delete the record, keeping enough to stop a Client.txt replay reopening it (alreadyClosed reads the history; a tombstone or hidden flag).

## Acceptance criteria
- [ ] Reopen shows only on row hover or keyboard focus
- [ ] Remove takes the row away, with Undo
- [ ] A removed offer doesn't return at restart from a Client.txt replay
- [ ] A new whisper from the same player still shows as a new offer
