---
id: WOKEPOET-99
title: Fix dock-menu e2e test failing since the Trades bubble stays
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
    date: '2026-11-05T12:15:18.165Z'
    comment: Created ticket.
    id: a-2026-11-05t12-15-18-165z
  - type: activity
    user: Agent
    date: '2026-11-05T12:19:42.059Z'
    comment: Updated implementation link.
    id: a-2026-11-05t12-19-42-059z
  - type: comment
    user: Agent
    comment: >-
      PR #177 merged. The dock-menu test now checks for offer rows instead of
      the buyer's name. Test-only change.
    date: '2026-11-05T12:28:53.964Z'
    completionComment: true
    id: c-2026-11-05t12-28-53-964z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-05T12:28:53.964Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:17:11.218Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/177'
needsAction: null
reviewState: null
---
e2e/dock-menu.spec.ts:113 "a click on a menu row leaves no card behind" fails every run on master.

Cause: it checks that no card is open by looking for the buyer's name anywhere in the trade icon. Since #147 the bubble stays until no offers are open and names the buyer, so the name is always found. The old bubble ended after 5 s. Nothing is wrong in the product.

Fix: check for an offer row (`[data-offer]`), which only the card draws.
