---
id: WOKEPOET-340
title: >-
  Theme every control: no plain web toggles, buttons, checkboxes, selects,
  sliders or fields
status: In Progress
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
---
Guy saw a web-style "On" pill in the loot filter Prices tab and asked for a scan of the whole overlay for controls that skip the PoE 1 look, then all of them switched to the themed parts (WToggle coin, w-btn plate, w-select/w-field wells, w-chip, w-seg, art slider).

Scope: woke code; APT core changes minimal. Skip the loot filter Prices tab (the "Redesign loot filter rules editor" thread owns it and the data-w-switches art in controls.css).

Scan (2026-11-16, master d7cddaf0): 37 plain inputs, 11 selects, 6 textareas, 12 range sliders, 13 native checkboxes, 7 radios, ~48 ad-hoc buttons (most are rows/icons and fine).

Checks: before/after headless shots, adversarial review, local checks (typecheck, lint, unit, build, tab-rail.spec if windows change). Worktree E:\Git\woke\wt\themed-controls, branch woke/themed-controls.
