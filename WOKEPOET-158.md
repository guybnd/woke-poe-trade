---
id: WOKEPOET-158
title: 'Landing: streamer feedback (GitHub link, hidden tabs, GIF slides)'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - landing
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-08T10:49:23.143Z'
    comment: Created ticket.
---
From a streamer visit (2026-11-08):
1. GitHub link "went nowhere" for the streamer, works for Guy.
2. Visitors scroll past the tabbed slides without seeing more tabs.
3. Content didn't land; Guy suggests GIFs instead of stills.

Findings on 1: every guybnd link on the live landing and docs pages returns 200/302 logged out, is visible and clickable on desktop and iPhone 13 (headless hit test). Repo is public, release v0.3.0 has assets. But the repo is a GitHub fork of SnosMe/awakened-poe-trade with 0 stars, so GitHub search does not list it (forks hidden by default). Asking Guy where the link came from.

2 and 3: mocks first (Guy's rule).
