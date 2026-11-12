---
id: WOKEPOET-15
title: 'Scarab flip module: EV of the vendor recipe'
status: Done
priority: None
effort: M
assignee: Agent
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T03:25:16.633Z'
    comment: Created ticket.
    id: a-2026-11-05t03-25-16-633z
  - type: comment
    user: Agent
    comment: >-
      Pick a layout for the scarab flip panel: A Buy list, B Stash sorter, or C
      Odds. Mockups: https://claude.ai/artifact/4UMB9W9shFz8GsM9j5wd5u. My pick
      is A with C as its second tab. Also confirm "flipping" means the 3-to-1
      vendor recipe, not buying in bulk to resell.
    date: '2026-11-05T03:28:15.187Z'
    id: c-2026-11-05t03-28-15-187z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T03:28:15.187Z'
    comment: >-
      Pick a layout for the scarab flip panel: A Buy list, B Stash sorter, or C
      Odds. Mockups: https://claude.ai/artifact/4UMB9W9shFz8GsM9j5wd5u. My pick
      is A with C as its second tab. Also confirm "flipping" means the 3-to-1
      vendor recipe, not buying in bulk to resell.
  - type: comment
    user: Agent
    comment: >-
      Guy approved the mockups ("looks good"), so A Buy list with C Odds as a
      second tab. Added: mark exceptionally rare scarabs that are cheap, since
      they may balloon in price.
    date: '2026-11-05T03:34:19.938Z'
    id: c-2026-11-05t03-34-19-938z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-05T03:34:19.938Z'
    comment: >-
      Guy approved the mockups ("looks good"), so A Buy list with C Odds as a
      second tab. Added: mark exceptionally rare scarabs that are cheap, since
      they may balloon in price.
  - type: activity
    user: Agent
    date: '2026-11-05T03:44:07.274Z'
    comment: Updated implementation link.
    id: a-2026-11-05t03-44-07-274z
  - type: comment
    user: Agent
    comment: >-
      PR 91 is open: https://github.com/guybnd/woke-poe-trade/pull/91. Panel has
      Buy list, Odds and Rare & cheap tabs. Unit tests, type checks and the new
      fake-game test pass locally. toolkit.spec would not load on my Windows run
      (Named export 'MODULES' not found), so CI needs to confirm the rest of the
      fake-game suite. Not yet tried in the real app. Work is in the clone
      E:\Git\woke-poe-trade-scarab on claude/scarab-flip, since the main
      checkout has another thread's uncommitted work.
    date: '2026-11-05T03:44:07.305Z'
    completionComment: true
    id: c-2026-11-05t03-44-07-305z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-05T03:44:07.305Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:49.988Z'
swimlane: null
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/91'
reviewState: null
---
> **TL;DR:** A new economy panel that says whether vendoring cheap scarabs pays right now, using poe.ninja prices and community drop weights.

Recipe (poewiki): any 3 scarabs vendor into a random scarab of a type other than the ones used, respecting drop weights.

Weights: 33,333-roll player sample from 3.27 (wiki reference, Lextra's sheet from u/VTSAX_'s post), plus wiki rarity tiers for scarabs the sample doesn't cover.

Mockups with options go to Guy first, then build plus tests in a worktree and a PR.
