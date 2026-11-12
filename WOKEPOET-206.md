---
id: WOKEPOET-206
title: Personal stash reader (POESESSID)
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-12T00:30:36.612Z'
    comment: Created ticket.
    id: a-2026-11-12t00-30-36-612z
  - type: activity
    user: Agent
    date: '2026-11-12T00:56:27.779Z'
    comment: Updated implementation link.
    id: a-2026-11-12t00-56-27-779z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/336 (branch
      feat/stash-reader). Local checks pass: typecheck, lint, unit tests
      (renderer 2931, main 161 incl. 21 new), both builds, bundle.allJs
      4697/4700. Independent bug review: 4 issues found, all fixed. Waiting on
      merge (cloud step), then switch the dev build to master. Guy turns it on
      with an empty %APPDATA%\woke-poe-trade\personal.flag.
    date: '2026-11-12T00:56:29.353Z'
    completionComment: true
    id: c-2026-11-12t00-56-29-353z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-12T00:56:29.353Z'
  - type: comment
    user: Agent
    comment: >-
      Squash-merged to master as a8c94ef2 (#336), all checks green. Dev build
      not switched yet (coordinator checking with Guy; it shows another thread's
      essence-scan preview). To use: empty
      %APPDATA%\woke-poe-trade\personal.flag, restart, sign in under Settings ›
      Game & league › Stash reader, add Net worth from the launcher.
    completionComment: true
    date: '2026-11-12T01:06:34.923Z'
    id: c-2026-11-12t01-06-34-923z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T01:06:35.245Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/336'
needsAction: null
baselineCommit: 07f0d76c04dce956b612747a57af8fe2004e7ee1
swimlane: null
diffSummary:
  - file: renderer/test/woke/trade-data-patch.test.ts
    additions: 7
    deletions: 0
  - file: scripts/trade-data-patch.mjs
    additions: 14
    deletions: 2
---
Personal-only stash reader via legacy character-window/get-stash-items with Guy's own POESESSID. Gated by personal.flag in userData. Mockups: https://claude.ai/artifact/FYYuDFZxMptKQJCA38ykAC — picks A1 B1 C1 D2.

- C1 gate: personal.flag in app.getPath('userData'); without it nothing registers.
- A1 login: Settings > Game "Stash reader" section; sign-in window on default session; cookie never leaves main.
- Reading in main: tabs=1 then each tab; respect X-Rate-Limit headers; stop on 401/403/429; per-tab cache.
- B1 Net worth widget: total div, change since yesterday, per hour, category bars, item drill-down; poe.ninja prices; daily snapshot.
- D2 refresh: manual button + hideout entry via Client.txt, max every 10 min.
