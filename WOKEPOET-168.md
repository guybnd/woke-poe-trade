---
id: WOKEPOET-168
title: 'Whole-project review: prioritised findings report'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - docs
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:34:35.692Z'
    comment: Created ticket.
    id: a-2026-11-10t02-34-35-692z
  - type: comment
    user: Agent
    comment: >-
      Report is up: https://claude.ai/artifact/Ag7Aow1vV4xmW9WwRvK96G (review
      only, no code changed).


      Top four to fix before 3.30: (A1) installer can't be built from master,
      the app-builder-lib patch is stale since #271; (A2) Build workflow has
      failed on every push since 5 Nov; (A3) 3.30 epic WOKEPOET-149 still in
      Grooming; (A4) crash Report and help links go to GitHub Issues, which are
      off.


      Questions for Guy:

      1. Do you want the report reshaped like the rooftap review? If so, send
      that report or its link.

      2. Which findings should become tickets? I'd start with A1, A2 and A4
      today.
    date: '2026-11-10T02:43:15.241Z'
    id: c-2026-11-10t02-43-15-241z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-10T02:43:15.241Z'
    comment: >-
      Report is up: https://claude.ai/artifact/Ag7Aow1vV4xmW9WwRvK96G (review
      only, no code changed).


      Top four to fix before 3.30: (A1) installer can't be built from master,
      the app-builder-lib patch is stale since #271; (A2) Build workflow has
      failed on every push since 5 Nov; (A3) 3.30 epic WOKEPOET-149 still in
      Grooming; (A4) crash Report and help links go to GitHub Issues, which are
      off.


      Questions for Guy:

      1. Do you want the report reshaped like the rooftap review? If so, send
      that report or its link.

      2. Which findings should become tickets? I'd start with A1, A2 and A4
      today.
swimlane: require-input
needsAction: null
---
Guy asked for a holistic review of woke-poe-trade: architecture, code quality, bugs and risk, UX consistency against the UI charter, performance, tests/CI, docs/landing, product gaps.

Output: a prioritised findings report (artifact) with concrete recommendations. Review only, no code changes or PRs. Read-only clone at E:\Git\woke-review (master 15278ddd).
