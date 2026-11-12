---
id: WOKEPOET-72
title: 'League mechanics settings: explain per mechanic what the overlay does'
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
    date: '2026-11-05T09:30:05.791Z'
    comment: Created ticket.
    id: a-2026-11-05t09-30-05-791z
  - type: comment
    user: Agent
    comment: >-
      Pick a layout from https://claude.ai/artifact/73vxCdUfUGy2Y6bjBRpGKj : A
      (pick a mechanic, read about it; recommended), B (every mechanic as a
      sentence) or C (coverage table). Build also fixes the empty Expedition
      prices and makes the launcher open the panel.
    date: '2026-11-05T09:35:44.243Z'
    id: c-2026-11-05t09-35-44-243z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T09:35:44.243Z'
    comment: >-
      Pick a layout from https://claude.ai/artifact/73vxCdUfUGy2Y6bjBRpGKj : A
      (pick a mechanic, read about it; recommended), B (every mechanic as a
      sentence) or C (coverage table). Build also fixes the empty Expedition
      prices and makes the launcher open the panel.
  - type: comment
    user: Agent
    comment: 'Guy: "looks ok". Building A, the recommended layout.'
    date: '2026-11-05T11:03:15.594Z'
    id: c-2026-11-05t11-03-15-594z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-05T11:03:15.594Z'
    comment: 'Guy: "looks ok". Building A, the recommended layout.'
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T11:03:15.665Z'
  - type: activity
    user: Agent
    date: '2026-11-05T11:16:25.462Z'
    comment: >-
      Layout A built as PR #162, branch woke-72-mechanics-guide, clone
      E:\Git\woke-mechanics-settings. Review fixes applied, checks pass. Merge
      requested through the coordinator.
    id: a-2026-11-05t11-16-25-462z
  - type: comment
    user: Agent
    comment: >-
      Layout A was merged as #162 (Explain each league mechanic on its settings
      page), with follow-ups in #265 and #297.
    date: '2026-11-12T06:21:34.890Z'
    completionComment: true
    id: c-2026-11-12t06-21-34-890z
  - type: status_change
    from: In Progress
    to: Done
    user: Agent
    date: '2026-11-12T06:21:34.891Z'
swimlane: null
needsAction: null
---
> **TL;DR** The League mechanics settings page reads like a Syndicate-only page. Rework it so each mechanic says what the overlay shows, when, and how to configure it. Mocks with options first; Guy picks; then build.

Current page (`woke/mechanics/mechanics-editor.vue`): one auto-switch toggle, a flat show/hide checklist, then the Betrayal reward editor which dominates the page.
