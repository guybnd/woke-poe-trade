---
id: WOKEPOET-62
title: 'Test whether holding a hotkey repeats it, and guard if so'
status: Done
priority: Medium
effort: XS
assignee: unassigned
tags:
  - bug
  - overlay-core
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-36
history:
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:22.553Z'
    comment: Created ticket.
    id: a-2026-11-05t08-10-22-553z
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:22.553Z'
    comment: Created as subtask of WOKEPOET-36.
    id: a-2026-11-05t08-10-22-553z
  - type: activity
    user: Agent
    date: '2026-11-05T10:53:21.556Z'
    comment: Updated implementation link.
    id: a-2026-11-05t10-53-21-556z
  - type: comment
    user: Agent
    comment: >-
      Guard merged in #150. The test is still open: does holding a hotkey repeat
      it on Windows? The pause before a key starts repeating can still let one
      extra press through. Left open until someone tries it in game.
    date: '2026-11-05T11:08:34.427Z'
    selfAttested: true
    id: c-2026-11-05t11-08-34-427z
  - type: comment
    user: Agent
    comment: 'Guy, 2026-11-12: Later. He thinks a held hotkey shouldn''t repeat.'
    date: '2026-11-12T05:23:58.885Z'
    selfAttested: true
    id: c-2026-11-12t05-23-58-885z
  - type: comment
    user: Agent
    comment: >-
      Closed on Guy's "Apply all" (2026-11-13). Guard merged in #150; the
      in-game check "holding a hotkey doesn't repeat it" moved to WOKEPOET-173's
      checklist.
    date: '2026-11-13T01:56:02.333Z'
    completionComment: true
    id: c-2026-11-13t01-56-02-333z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-13T01:56:02.333Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/150'
needsAction: null
---
> **TL;DR** C17. The hotkey callback has no repeat guard (Shortcuts.ts register), and GGG's rules allow one action per press. Whether Windows repeats these hotkeys needs a test. A guard keyed on the uIOhook keyup is cheap either way: ignore a hotkey until its key has been released.
