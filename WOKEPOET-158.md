---
id: WOKEPOET-158
title: 'Landing: streamer feedback (GitHub link, hidden tabs, GIF slides)'
status: Todo
priority: None
effort: L
assignee: unassigned
tags:
  - landing
createdBy: Agent
updatedBy: Event Horizon
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
  - type: activity
    user: Agent
    date: '2026-11-08T10:59:28.701Z'
    comment: Updated description.
    id: a-2026-11-08t10-59-28-701z
  - type: comment
    user: Agent
    comment: >-
      Guy picked C (picture strip, keep plates) and M1 clips, with a clip script
      and new order.
    date: '2026-11-08T10:59:30.794Z'
    id: c-2026-11-08t10-59-30-794z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-08T10:59:30.794Z'
    comment: >-
      Guy picked C (picture strip, keep plates) and M1 clips, with a clip script
      and new order.
  - type: activity
    user: Agent
    date: '2026-11-08T10:59:41.592Z'
    comment: Updated description. Changed effort to L.
    id: a-2026-11-08t10-59-41-592z
  - type: activity
    user: Agent
    date: '2026-11-08T10:59:55.566Z'
    comment: Updated description.
    id: a-2026-11-08t10-59-55-566z
  - type: status_change
    from: Grooming
    to: Todo
    user: Agent
    date: '2026-11-08T10:59:57.148Z'
  - type: activity
    user: claude-code@guy-pc
    date: '2026-11-08T11:00:01.279Z'
    comment: Claimed by claude-code@guy-pc
    id: a-2026-11-08t11-00-01-279z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@guy-pc
    date: '2026-11-08T11:00:01.279Z'
  - type: activity
    user: Event Horizon
    date: '2026-11-08T11:31:04.039Z'
    comment: Claim by claude-code@guy-pc expired (no heartbeat for 30 min)
    id: a-2026-11-08t11-31-04-039z
  - type: status_change
    from: In Progress
    to: Todo
    user: Event Horizon
    date: '2026-11-08T11:31:04.067Z'
swimlane: null
needsAction: null
---
> **TL;DR** Replace the landing slides with scripted looping clips of the real overlay (MP4/WebM), add a picture strip under each shot while keeping the name plates as tabs, and reorder the sections. GitHub link failure was not reproducible.

From a streamer visit (2026-11-08):
1. GitHub link errored for the streamer. Not reproducible: both repo links work logged out from 5 entry URL variants (headless click test). Likely a GitHub-side error page. Asked Guy for the error text / VOD.
2. Visitors scroll past the tabbed slides. Guy picked C (picture strip under the shot) but keep the name plates as tabs.
3. Guy picked M1: looping clips per slide, MP4/WebM.

## Clip plan (Guy, 2026-11-08), new section order
- Price check first: mouse over a few listings (first screen visitors see).
- PoB second: move through tabs, open passive tree, change loadouts.
- Filter third: quickly edit an item tier.
- Market: trigger search on the Deli orb tab (scarabs gone in 3.30).
- On your screen: tab through a few.
- Quick search lower in the order: typing brings up options.

## How
Extend the testing/e2e/landing-highlights harness (headless Chromium, real overlay over game frames), script interactions, record frames, encode MP4 (H.264) + WebM with ffmpeg, draw a PoE cursor. Mocks: https://claude.ai/artifact/9eajenQsaiuLiTzPiKZ8P8

## Acceptance criteria
- [ ] Price check and PoB clips posted to Guy for a look before the rest
- [ ] Clips for each section listed above, muted autoplay loop, lazy loaded, still poster fallback, reduced-motion shows the still
- [ ] Picture strip under each shot, plates kept as tabs
- [ ] Section order as above
- [ ] Page weight checked; no window opens over PoE while recording
- [ ] Adversarial review, local checks, merged, live

## Test plan
- Landing specs still pass (CI landing check), plus a spec that each slide has a clip with a poster and the strip switches slides.
- Headless check of the built page: desktop and phone, clips play, strip visible, reduced-motion shows stills.
- Typecheck, lint, docs build.
