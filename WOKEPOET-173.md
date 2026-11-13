---
id: WOKEPOET-173
title: 'In-game checklist per release, starting with features never tried in game'
status: Archived
priority: High
effort: S
assignee: unassigned
tags:
  - tooling
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:40.921Z'
    comment: Created ticket.
    id: a-2026-11-10t02-55-40-921z
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:40.921Z'
    comment: Created as subtask of WOKEPOET-168.
    id: a-2026-11-10t02-55-40-921z
  - type: activity
    user: Agent
    date: '2026-11-13T01:55:57.103Z'
    comment: Updated description.
    id: a-2026-11-13t01-55-57-103z
  - type: comment
    user: Agent
    comment: >-
      Guy 2026-11-13: dropped. The hotkey-repeat line from WOKEPOET-62 lived
      here (holding a hotkey must not repeat it, guard #150, never tried in the
      real game). No test ticket or editable release notes to move it to without
      a code change, so it is recorded here only.
    date: '2026-11-13T03:02:37.807Z'
    id: c-2026-11-13t03-02-37-807z
  - type: status_change
    from: Grooming
    to: Archived
    user: Agent
    date: '2026-11-13T03:02:37.807Z'
needsAction: null
---
Review finding B1. Tests run on a fake game. Project notes mark these as untried in the real game: full window from a dock card (#240), ? hover hints (#234), item tooltip on every row (#154), Harvest swap pricing (#277-280), History row tooltips (#235), mouse wheel in the filter rule list (#184), holding a hotkey doesn't repeat it (guard #150, from WOKEPOET-62).

Deliver: a checklist page (one line per feature shipped since the last release, what to do, what to expect) generated from merged pull requests, for Guy to run in about 30 minutes before each release. First one covers v0.3.0..master.
