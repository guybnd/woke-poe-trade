---
id: WOKEPOET-74
title: 'Trades card: collapse offers, fix wrapped button row'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T09:46:31.980Z'
    comment: Created ticket.
    id: a-2026-11-05t09-46-31-980z
  - type: comment
    user: Agent
    comment: >-
      Which layout: A, B or C? Recommended: C. Mocks:
      https://claude.ai/artifact/8ijRB7sNGAW8r6NuRThEiX
    date: '2026-11-05T09:46:41.962Z'
    id: c-2026-11-05t09-46-41-962z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T09:46:41.962Z'
    comment: >-
      Which layout: A, B or C? Recommended: C. Mocks:
      https://claude.ai/artifact/8ijRB7sNGAW8r6NuRThEiX
  - type: activity
    user: Agent
    date: '2026-11-05T09:48:19.898Z'
    comment: >-
      Added scope from Guy: a dismissed offer gets a Reopen button on its row,
      so an accidental dismiss can be undone. Mocks A, B and C updated. Also in
      scope: unique art lookup keeps the comma in the name, and the ✓ ✕ buttons
      render squashed.
    id: a-2026-11-05t09-48-19-898z
  - type: comment
    user: Agent
    comment: >-
      Guy picked one-line rows with the next step on hover, click to expand, a
      row style setting and a kept history. PR #147.
    date: '2026-11-05T10:14:14.073Z'
    id: c-2026-11-05t10-14-14-073z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-05T10:14:14.073Z'
    comment: >-
      Guy picked one-line rows with the next step on hover, click to expand, a
      row style setting and a kept history. PR #147.
  - type: activity
    user: Agent
    date: '2026-11-05T10:14:14.113Z'
    comment: Updated implementation link.
    id: a-2026-11-05t10-14-14-113z
  - type: comment
    user: Agent
    comment: >-
      PR #147 merged as f60def4: one-line rows, next step on hover, Offer rows
      setting, History with Reopen, Keep the offer bubble setting. Waiting on
      the shared dev update to confirm it on the overlay.
    date: '2026-11-05T12:03:01.266Z'
    completionComment: true
    id: c-2026-11-05t12-03-01-266z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-05T12:03:01.266Z'
  - type: activity
    user: Agent
    date: '2026-11-05T12:28:46.380Z'
    comment: >-
      Live on dev 9a3784a1 (#147 code served, checked read-only over CDP).
      Follow-up PR #179: the bubble now shows for offers read back after a
      restart and moves on with the skip key. Under adversarial review.
    id: a-2026-11-05t12-28-46-380z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:58.436Z'
swimlane: null
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/147'
reviewState: null
---
Guy wants to click an offer to collapse it for easier browsing with several offers. Today the top offer can't be collapsed (OfferRow accordion, `expand` in WidgetTrade.vue). The ✓ and ✕ buttons also wrap onto their own line in the 23rem card.

Mocks: https://claude.ai/artifact/8ijRB7sNGAW8r6NuRThEiX
A: same two-line rows, click to close. B: one-line rows. C: one-line rows with the next-step button on each row (recommended).
All three split the buttons into two rows: steps, then Busy/Still?/Sold with ✓ ✕ on the right.

No code until Guy picks.
