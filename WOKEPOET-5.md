---
id: WOKEPOET-5
title: Decide on Tauri after in-game test
status: Archived
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T02:07:55.807Z'
    comment: Created ticket.
    id: a-2026-11-05t02-07-55-807z
  - type: comment
    user: Agent
    comment: >-
      **Please run the `woke-tauri-test` build over PoE and report back: how
      much memory did it use, and how did it behave?** Get it from the CI
      artifact on PR #79 (https://github.com/guybnd/woke-poe-trade/pull/79); its
      tray menu has Show test numbers for memory. The decision to move off
      Electron depends on this:
      https://claude.ai/artifact/PsvGcVErmMx1HPePhViXyt
    date: '2026-11-05T02:08:12.348Z'
    id: c-2026-11-05t02-08-12-348z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T02:08:12.348Z'
    comment: >-
      **Please run the `woke-tauri-test` build over PoE and report back: how
      much memory did it use, and how did it behave?** Get it from the CI
      artifact on PR #79 (https://github.com/guybnd/woke-poe-trade/pull/79); its
      tray menu has Show test numbers for memory. The decision to move off
      Electron depends on this:
      https://claude.ai/artifact/PsvGcVErmMx1HPePhViXyt
  - type: comment
    user: Agent
    comment: 'Guy, 2026-11-12 picker: Drop Tauri.'
    date: '2026-11-12T04:31:36.354Z'
    id: c-2026-11-12t04-31-36-354z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-12T04:31:36.354Z'
  - type: status_change
    from: Grooming
    to: Archived
    user: Agent
    date: '2026-11-12T04:31:36.354Z'
swimlane: null
needsAction: null
---
> **TL;DR** — Guy runs the **woke-tauri-test build over PoE** and reports **memory and behaviour**. Done looks like a **go or no-go on moving off Electron**.

## Context
- Test build: PR-79 / draft PR https://github.com/guybnd/woke-poe-trade/pull/79. CI uploads the `woke-tauri-test` artifact (exe + web/ + README).
- Decision doc: https://claude.ai/artifact/PsvGcVErmMx1HPePhViXyt
- The test build leaves out OCR scans, the in-overlay browser, Client.txt, file-based woke handlers and the updater, so those can't be judged from it.
