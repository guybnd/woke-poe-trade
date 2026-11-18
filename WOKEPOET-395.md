---
id: WOKEPOET-395
title: >-
  Loot filter bug hunt round 2: own rule names, Alt+F keys, share fold, low maps
  look
status: Grooming
priority: Medium
effort: S
assignee: unassigned
tags:
  - bug
  - loot-filter
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T16:07:30.438Z'
    comment: Created ticket.
---
Done on branch `woke/filter-bughunt-2` (1511f583, f6f213bf) off master, and sent to merge. Follow-up to WOKEPOET-392.

- An own rule with a base type the game doesn't know is held back with a reason, because the game refused the whole filter. Item classes now get the spelling warning as well.
- Alt+F card keys (1, 2, 3, G) only act on the card, never on keys meant for another overlay window.
- Adding a share code folds its changes into yours, the way edits made in the editor fold.
- Hide low maps uses a hidden copy above NeverSink's rule, so influenced maps and maps above your zone keep their tier's look.

Dropped: boss-only uniques stay out of the net (Guy's call). The stack "Not for me" change was backed out: it never lapsed anyway.
