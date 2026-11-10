---
id: WOKEPOET-172
title: 'Crash Report and help links go to GitHub Issues, which are off'
status: Done
priority: High
effort: XS
assignee: unassigned
tags:
  - bug
  - docs
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:37.526Z'
    comment: Created ticket.
    id: a-2026-11-10t02-55-37-526z
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:37.526Z'
    comment: Created as subtask of WOKEPOET-168.
    id: a-2026-11-10t02-55-37-526z
  - type: comment
    user: Agent
    comment: >-
      Guy picked GitHub Issues (2026-11-10). No code change is needed: the crash
      Report button, docs/issues.md and the README already point at /issues/new.
      The only step is switching Issues on, and the PC's safety check refused
      that from here (repo settings change). Guy: tick Issues at
      https://github.com/guybnd/woke-poe-trade/settings (General, Features).
      After that, check https://github.com/guybnd/woke-poe-trade/issues/new
      loads and close this ticket.
    date: '2026-11-10T06:10:44.755Z'
    id: c-2026-11-10t06-10-44-755z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-10T06:10:44.755Z'
    comment: >-
      Guy picked GitHub Issues (2026-11-10). No code change is needed: the crash
      Report button, docs/issues.md and the README already point at /issues/new.
      The only step is switching Issues on, and the PC's safety check refused
      that from here (repo settings change). Guy: tick Issues at
      https://github.com/guybnd/woke-poe-trade/settings (General, Features).
      After that, check https://github.com/guybnd/woke-poe-trade/issues/new
      loads and close this ticket.
  - type: comment
    user: Agent
    comment: >-
      Guy switched Issues on. Verified 2026-11-10: has_issues is true and
      https://github.com/guybnd/woke-poe-trade/issues returns 200. No code
      change needed.
    date: '2026-11-10T06:12:35.441Z'
    id: c-2026-11-10t06-12-35-441z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-10T06:12:35.441Z'
    comment: >-
      Guy switched Issues on. Verified 2026-11-10: has_issues is true and
      https://github.com/guybnd/woke-poe-trade/issues returns 200. No code
      change needed.
  - type: comment
    user: Agent
    comment: Issues are on; Report and help links now resolve. No diff.
    date: '2026-11-10T06:12:36.495Z'
    completionComment: true
    id: c-2026-11-10t06-12-36-495z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-10T06:12:36.495Z'
swimlane: null
needsAction: null
---
Review finding A4. Issues and Discussions are disabled on guybnd/woke-poe-trade, but these send players to `/issues/new`:
- `main/src/woke/crash-reports.ts:12` (`ISSUES_URL`, the crash Report button)
- `docs/issues.md:29`
- README privacy section ("Report opens a GitHub issue")
- SECURITY.md mentions the same flow

Decision for Guy: switch Issues on (fits the pre-filled crash report), or point all of them at the Discord the About page uses (#181). Recommended: switch Issues on.
