---
id: WOKEPOET-523
title: 'Bulk map buying: leave out Elder maps, reach pricier bulk sellers'
status: Released
priority: Medium
effort: M
assignee: unassigned
tags:
  - price-check
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-24T01:47:00.486Z'
    comment: Created ticket.
    id: a-2026-11-24t01-47-00-486z
  - type: activity
    user: claude-code@GUY-PC
    date: '2026-11-24T01:47:04.061Z'
    comment: Claimed by claude-code@GUY-PC
    id: a-2026-11-24t01-47-04-061z
  - type: status_change
    from: Todo
    to: In Progress
    user: claude-code@GUY-PC
    date: '2026-11-24T01:47:04.061Z'
  - type: activity
    user: Agent
    date: '2026-11-24T01:48:43.168Z'
    comment: >-
      Mockup with picks: https://claude.ai/artifact/Wy7fSr5VY4MiXdXqr1rj39 .
      Building 1 (No Elder chip, on) + 2A (Exchange button) meanwhile.
    id: a-2026-11-24t01-48-43-168z
  - type: activity
    user: Agent
    date: '2026-11-24T02:08:50.788Z'
    comment: >-
      Guy picked 2B on top of 2A. PR
      https://github.com/guybnd/woke-poe-trade/pull/828 now has No Elder,
      Exchange and Pricier; first review's findings fixed; second review + CI
      running.
    id: a-2026-11-24t02-08-50-788z
  - type: activity
    user: Event Horizon
    date: '2026-11-24T02:39:08.402Z'
    comment: Claim by claude-code@GUY-PC expired (no heartbeat for 30 min)
    id: a-2026-11-24t02-39-08-402z
  - type: status_change
    from: In Progress
    to: Todo
    user: Event Horizon
    date: '2026-11-24T02:39:08.408Z'
  - type: comment
    user: Agent
    comment: >-
      PR 828 merged (No Elder chip, Exchange button, Pricier chip); reviews
      done, CI green.
    date: '2026-11-24T02:58:04.648Z'
    completionComment: true
    id: c-2026-11-24t02-58-04-648z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-24T02:58:04.648Z'
  - type: comment
    user: Agent
    comment: >-
      Merged PR 828: No Elder chip on map price checks (on by default, kept by
      Base map), Exchange button for the map's bulk exchange entry (sellers with
      stock), and Pricier chip (Guy's 2B) that searches again from the dearest
      loaded listing. Two adversarial reviews, findings fixed; CI green. Open:
      whether an Originator+Elder map trades under zana-map or its guardian
      entry is unverified (mapped to guardian).
    completionComment: true
    date: '2026-11-24T02:58:11.262Z'
    id: c-2026-11-24t02-58-11-262z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-24T02:58:11.708Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-25T04:05:59.612Z'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/828'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
version: 1.30.20
releasedAt: '2026-11-25T04:05:49.382Z'
releaseDocPath: release-notes/1.30.20
---
Guy (2026-11-24): buying influenced (Originator) maps in bulk. (1) avoid Elder-influenced ones; (2) bulk results are poor, wants to pull in further, pricier listings.

Verified live (Covens, 2026-11-24):
- Maps have no exchange tag, so the price check uses the normal trade search (100 cheapest ids per search).
- T16 Originator maps: 807 also carry "Area is influenced by The Elder" + a guardian occupation, listed cheap (10c), so they crowd the cheapest rows. Originator + Shaper or Conqueror: 0.
- Online Originator T16 without Elder/Shaper influence: 2906 listings; the 100 cheapest all end at 20c, mostly single copies.
- Bulk exchange has a "Memory-Influenced Map (Tier 16)" bucket (zana-map-tier-16): 48 online sellers, 2c to 70c, stocks up to 1400 at 50-70c. Whether that bucket can hold Elder-occupied ones is not verified.

Plan: mockup with options, build recommended (Not Elder chip on by default + Exchange view for maps on click).
