---
id: WOKEPOET-340
title: >-
  Theme every control: no plain web toggles, buttons, checkboxes, selects,
  sliders or fields
status: Done
priority: Medium
effort: None
assignee: Agent
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-16T06:56:22.666Z'
    comment: Created ticket.
    id: a-2026-11-16t06-56-22-666z
  - type: activity
    user: Agent
    date: '2026-11-16T07:23:45.185Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/554 sent to merge. Shared
      CSS themes native checkboxes/radios/sliders/select arrows in every toolkit
      window (art: checkbox coin, slider handle); w-input/w-select on ad-hoc
      fields; w-chip for rail popup, filter Shown pills, dock chips, PoB Mine.
      Shots: E:\Git\woke\scratch\themed-controls (b/, a/, before-after.png).
    id: a-2026-11-16t07-23-45-185z
  - type: activity
    user: Agent
    date: '2026-11-16T07:23:45.797Z'
    comment: Updated implementation link.
    id: a-2026-11-16t07-23-45-797z
  - type: comment
    user: Agent
    comment: >-
      PR #554 merged as 19a1475b: native checkboxes, radios, sliders and select
      arrows themed in every toolkit window; ad-hoc fields on w-input/w-select;
      pills on w-chip. Review done, CI green.
    date: '2026-11-16T07:33:23.117Z'
    completionComment: true
    id: c-2026-11-16t07-33-23-117z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-16T07:33:23.117Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 19a1475b. Every plain control now wears the PoE look; shared CSS
      covers future windows.
    completionComment: true
    date: '2026-11-16T07:33:27.086Z'
    id: c-2026-11-16t07-33-27-086z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-16T07:33:27.383Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/554'
needsAction: null
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
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
---
Guy saw a web-style "On" pill in the loot filter Prices tab and asked for a scan of the whole overlay for controls that skip the PoE 1 look, then all of them switched to the themed parts (WToggle coin, w-btn plate, w-select/w-field wells, w-chip, w-seg, art slider).

Scope: woke code; APT core changes minimal. Skip the loot filter Prices tab (the "Redesign loot filter rules editor" thread owns it and the data-w-switches art in controls.css).

Scan (2026-11-16, master d7cddaf0): 37 plain inputs, 11 selects, 6 textareas, 12 range sliders, 13 native checkboxes, 7 radios, ~48 ad-hoc buttons (most are rows/icons and fine).

Checks: before/after headless shots, adversarial review, local checks (typecheck, lint, unit, build, tab-rail.spec if windows change). Worktree E:\Git\woke\wt\themed-controls, branch woke/themed-controls.
