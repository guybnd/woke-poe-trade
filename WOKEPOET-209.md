---
id: WOKEPOET-209
title: 'Stash reader: pick which tabs to read, with templates'
status: Ready
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
    date: '2026-11-12T03:07:27.550Z'
    comment: Created ticket.
    id: a-2026-11-12t03-07-27-550z
  - type: activity
    user: Agent
    date: '2026-11-12T03:07:32.973Z'
    comment: >-
      On hold for Guy's picks from the existing mockups
      (https://claude.ai/artifact/LRT1xQUfnq4nfrvSYZTePh): L1/L2 list layout,
      T1-T4 templates, F1/F2 where the picker shows, N1/N2 new tabs. The
      proposal in the body is superseded by those options.
    id: a-2026-11-12t03-07-32-973z
  - type: comment
    user: Agent
    comment: >-
      PR #345 is ready to merge: the tab picker with L1, T1-T4, F1 and N1, with
      remove-only tabs always excluded. The 6 bugs from the review are fixed.
      Local checks pass: typecheck, lint, renderer tests (2973), main tests
      (230) and the build. Startup JS is 2200.4 KB. The dev build is running the
      branch.
    date: '2026-11-12T03:27:16.149Z'
    completionComment: true
    id: c-2026-11-12t03-27-16-149z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-12T03:27:16.149Z'
needsAction: null
---
Guy (2026-11-12): pick first which tabs to sync, with a couple of templates, one a "reasonable read". Follows #339/#341/#342. Mocks first (woke rule).

Proposed templates:
- Reasonable (default): special tabs (Currency, Fragment, Divination, Map, Essence, Delve, Blight, Delirium, Flask, Gem, Unique...) + normal/quad tabs, no remove-only, capped at ~30 tabs.
- Currency only: currency-type special tabs.
- Everything: all tabs except remove-only.
- Custom: tick tabs in a list (tab list is 1 request).
First sign-in shows the picker before any full read; quiet hideout reads only read chosen tabs.
