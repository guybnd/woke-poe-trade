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
    id: a-2026-11-08t10-49-23-143z
  - type: comment
    user: Agent
    comment: >-
      Mocks: https://claude.ai/artifact/9eajenQsaiuLiTzPiKZ8P8. Tabs: A
      arrows+count, B autoplay with progress (recommended), C picture tabs.
      Motion: M1 real looping clips as MP4/WebM (recommended, needs an
      off-stream recording session), M2 zoom+labels on stills, M3 hero reel.
      GitHub link: nothing broken on the site; need from Guy where the streamer
      clicked/saw it. Likely GitHub search hides the repo because it's a 0-star
      fork; fix is Guy's "Leave fork network" in repo settings.
    date: '2026-11-08T10:53:18.012Z'
    id: c-2026-11-08t10-53-18-012z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-08T10:53:18.012Z'
    comment: >-
      Mocks: https://claude.ai/artifact/9eajenQsaiuLiTzPiKZ8P8. Tabs: A
      arrows+count, B autoplay with progress (recommended), C picture tabs.
      Motion: M1 real looping clips as MP4/WebM (recommended, needs an
      off-stream recording session), M2 zoom+labels on stills, M3 hero reel.
      GitHub link: nothing broken on the site; need from Guy where the streamer
      clicked/saw it. Likely GitHub search hides the repo because it's a 0-star
      fork; fix is Guy's "Leave fork network" in repo settings.
  - type: activity
    user: Agent
    date: '2026-11-08T10:55:08.625Z'
    comment: >-
      Guy: streamer opened the site from a chat link and clicked the GitHub
      button. Headless click test of both repo links (header "View on GitHub",
      footer "GitHub") from 5 entry URL variants, logged out: all land on the
      repo page. Not reproducible; asked Guy for a VOD timestamp. Likely a
      GitHub-side error page or the streamer's browser.
    id: a-2026-11-08t10-55-08-625z
swimlane: require-input
needsAction: null
---
From a streamer visit (2026-11-08):
1. GitHub link "went nowhere" for the streamer, works for Guy.
2. Visitors scroll past the tabbed slides without seeing more tabs.
3. Content didn't land; Guy suggests GIFs instead of stills.

Findings on 1: every guybnd link on the live landing and docs pages returns 200/302 logged out, is visible and clickable on desktop and iPhone 13 (headless hit test). Repo is public, release v0.3.0 has assets. But the repo is a GitHub fork of SnosMe/awakened-poe-trade with 0 stars, so GitHub search does not list it (forks hidden by default). Asking Guy where the link came from.

2 and 3: mocks first (Guy's rule).
