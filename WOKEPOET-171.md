---
id: WOKEPOET-171
title: 'Build workflow: Windows only, and a failure must be seen'
status: In Progress
priority: High
effort: S
assignee: unassigned
tags:
  - bug
  - tooling
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:33.943Z'
    comment: Created ticket.
    id: a-2026-11-10t02-55-33-943z
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:33.943Z'
    comment: Created as subtask of WOKEPOET-168.
    id: a-2026-11-10t02-55-33-943z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-10T03:16:00.896Z'
  - type: comment
    user: Agent
    comment: >-
      Merged in #295: main.yml replaced by a "Windows package" job in Tests
      (runs on main/ or workflow changes, and on master; green on the PR). Left:
      adding "Windows package" to the "CI must pass on master" ruleset. My
      permission settings blocked me from changing the ruleset. Guy: add it in
      GitHub (Settings → Rules → CI must pass on master → required checks), or
      allow me and I'll do it.
    date: '2026-11-10T03:35:09.326Z'
    id: c-2026-11-10t03-35-09-326z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-10T03:35:09.326Z'
    comment: >-
      Merged in #295: main.yml replaced by a "Windows package" job in Tests
      (runs on main/ or workflow changes, and on master; green on the PR). Left:
      adding "Windows package" to the "CI must pass on master" ruleset. My
      permission settings blocked me from changing the ruleset. Guy: add it in
      GitHub (Settings → Rules → CI must pass on master → required checks), or
      allow me and I'll do it.
needsAction: null
swimlane: require-input
---
Review finding A2. The last 30 runs of `.github/workflows/main.yml` are all cancelled (last success 2026-11-05): the Linux package job fails and fail-fast cancels Windows and macOS. It isn't a required check, so nobody was told. It also packages macOS and Linux, which are never released.

Fix: cut the matrix to `windows-2022`; run the Windows package job on pull requests that touch `main/` (or make its failure on master open a ticket); consider adding it to the "CI must pass on master" ruleset. Mind Guy's rule that GitHub CI is slow: keep it off the path for renderer-only changes.

Depends on the builder patch ticket.
