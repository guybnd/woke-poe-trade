---
id: WOKEPOET-36
title: 'Overlay core critique: pick which fixes to start'
status: Done
priority: High
effort: None
assignee: unassigned
tags:
  - critique
  - overlay-core
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T07:36:24.682Z'
    comment: Created ticket.
    id: a-2026-11-05t07-36-24-682z
  - type: comment
    user: Agent
    comment: >-
      Which fixes should I start? Recommended: 1 (no chat send without a key
      press, focus check), 2 (lock the local server) and 3 (safe settings). Fix
      1 needs a mock for where "filter ready, reload?" shows; 2 and 3 need no
      UI. Report: https://claude.ai/artifact/Du1efrqGyeBo1LyyHQHtTw
    date: '2026-11-05T07:36:29.069Z'
    id: c-2026-11-05t07-36-29-069z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T07:36:29.069Z'
    comment: >-
      Which fixes should I start? Recommended: 1 (no chat send without a key
      press, focus check), 2 (lock the local server) and 3 (safe settings). Fix
      1 needs a mock for where "filter ready, reload?" shows; 2 and 3 need no
      UI. Report: https://claude.ai/artifact/Du1efrqGyeBo1LyyHQHtTw
  - type: comment
    user: Agent
    comment: >-
      Guy asked to ticket everything and fix the important and easy ones. All 23
      findings are WOKEPOET-40 to 62. In PRs now: #126 (40, 42), #128 (41, 55),
      #129 (43, 44, 58), #133 (45, 47, 48, 52). The rest stay in Grooming.
      WOKEPOET-60 is partly covered by #127.
    date: '2026-11-05T08:51:15.947Z'
    id: c-2026-11-05t08-51-15-947z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-05T08:51:15.947Z'
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-05T08:51:15.947Z'
  - type: comment
    user: Agent
    comment: >-
      Which reload prompt: A (dock icon and card), B (a note and one new key),
      or C (rail badge)? Recommended: A, with no new hotkey. Also, build the
      tray status and hotkey rescue as drawn (WOKEPOET-46, 49)? Default: yes.
      Mocks: https://claude.ai/artifact/18ihCQ5vBMjx9mZUXTJQwU
    date: '2026-11-05T11:02:36.868Z'
    id: c-2026-11-05t11-02-36-868z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T11:02:36.868Z'
    comment: >-
      Which reload prompt: A (dock icon and card), B (a note and one new key),
      or C (rail badge)? Recommended: A, with no new hotkey. Also, build the
      tray status and hotkey rescue as drawn (WOKEPOET-46, 49)? Default: yes.
      Mocks: https://claude.ai/artifact/18ihCQ5vBMjx9mZUXTJQwU
  - type: comment
    user: Agent
    comment: >-
      Guy picked A plus a key hint; merged in #168. Still open: 51 (item data
      updates), 53 (rollback, signing, prompt when the game is closed), 57
      (config swap), 62 (repeat test in game).
    date: '2026-11-05T12:40:16.699Z'
    id: c-2026-11-05t12-40-16-699z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-05T12:40:16.699Z'
    comment: >-
      Guy picked A plus a key hint; merged in #168. Still open: 51 (item data
      updates), 53 (rollback, signing, prompt when the game is closed), 57
      (config swap), 62 (repeat test in game).
  - type: status_change
    from: In Progress
    to: Done
    user: Agent
    date: '2026-11-12T00:17:33.888Z'
swimlane: null
needsAction: null
subtasks:
  - WOKEPOET-40
  - WOKEPOET-41
  - WOKEPOET-42
  - WOKEPOET-43
  - WOKEPOET-44
  - WOKEPOET-45
  - WOKEPOET-46
  - WOKEPOET-47
  - WOKEPOET-48
  - WOKEPOET-49
  - WOKEPOET-50
  - WOKEPOET-51
  - WOKEPOET-52
  - WOKEPOET-53
  - WOKEPOET-54
  - WOKEPOET-55
  - WOKEPOET-56
  - WOKEPOET-57
  - WOKEPOET-58
  - WOKEPOET-59
  - WOKEPOET-60
  - WOKEPOET-61
  - WOKEPOET-62
  - WOKEPOET-98
  - WOKEPOET-105
---
Harsh critique of the overlay core, read-only on master be3d56a5.

Report: https://claude.ai/artifact/Du1efrqGyeBo1LyyHQHtTw

Top findings:
- F1: loot filter sends /itemfilter from a Client.txt line plus a timer, with no key pressed (store.ts:123-130, 796). Against GGG's macro rules.
- F2: local server has no Origin or Host check on a fixed port, so any web page can drive the app (server.ts:69-76, pob-builds.ts:107).
- F3: chat keys typed with no focus check (Shortcuts.ts:84-91).
- F4, F5: settings not saved until Settings closes; a damaged config silently resets, with no backup.
- F6: failed price check shows nothing.

No code changes until Guy picks. New UI needs mocks first.
