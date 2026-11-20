---
id: WOKEPOET-422
title: 'Map price check: merge Run it? into Trade search'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - ui
  - price-check
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-20T16:55:18.470Z'
    comment: Created ticket.
    id: a-2026-11-20t16-55-18-470z
  - type: activity
    user: Agent
    date: '2026-11-20T17:06:05.272Z'
    comment: Updated implementation link.
    id: a-2026-11-20t17-06-05-272z
  - type: activity
    user: Agent
    date: '2026-11-20T17:06:05.385Z'
    comment: >-
      Guy picked A (mocks https://claude.ai/artifact/97jA1T1gvfk4wSue3K2h1i)
      with a tweak: Trade search left, verdict + Juice right on one line. Built,
      reviewed, local checks green; PR #690 waiting on CI to merge.
    id: a-2026-11-20t17-06-05-385z
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/690'
---
Guy (2026-11-20, screenshot of a Nightmare Map price check) asked why "Run it? Safe · Juice 85" and "Trade search" are separate sections. Run it? is read-only.

Plan: mock 2–3 layouts in the PoE1 look with pick buttons, recommend one (merge verdict + juice into the Trade search header), build it in MapModStrip.vue on a branch meanwhile. Layout only, no new info.
