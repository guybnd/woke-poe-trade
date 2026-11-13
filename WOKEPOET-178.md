---
id: WOKEPOET-178
title: Type the woke-request channel between overlay and main
status: Done
priority: Low
effort: M
assignee: unassigned
tags:
  - overlay-core
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:57.407Z'
    comment: Created ticket.
    id: a-2026-11-10t02-55-57-407z
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:57.407Z'
    comment: Created as subtask of WOKEPOET-168.
    id: a-2026-11-10t02-55-57-407z
  - type: comment
    user: Agent
    comment: 'Guy 2026-11-13: build now.'
    date: '2026-11-13T03:02:38.550Z'
    selfAttested: true
    id: c-2026-11-13t03-02-38-550z
  - type: activity
    user: Agent
    date: '2026-11-13T03:02:51.614Z'
    comment: Updated description.
    id: a-2026-11-13t03-02-51-614z
  - type: activity
    user: Agent
    date: '2026-11-13T03:03:02.451Z'
    comment: Updated description.
    id: a-2026-11-13t03-03-02-451z
  - type: status_change
    from: Grooming
    to: Todo
    user: Agent
    date: '2026-11-13T03:03:03.802Z'
  - type: comment
    user: Agent
    comment: >-
      Merged in #408 (af34d082): woke-request channel typed from
      ipc/woke-ops.ts.
    date: '2026-11-13T03:29:12.635Z'
    completionComment: true
    id: c-2026-11-13t03-29-12-635z
  - type: status_change
    from: Todo
    to: Ready
    user: Agent
    date: '2026-11-13T03:29:12.635Z'
  - type: comment
    user: Agent
    comment: >-
      ipc/woke-ops.ts types hostRequest and main's handler table; wrong op or
      args fail typecheck. No behaviour change. Merged in #408 (af34d082).
    completionComment: true
    date: '2026-11-13T03:29:19.924Z'
    id: c-2026-11-13t03-29-19-924z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-13T03:29:20.313Z'
needsAction: null
reviewState: approved
baselineCommit: 9747783386088b67140c621fed5865bf72798b69
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/408'
swimlane: null
diffSummary:
  - file: renderer/src/web/woke/mechanics/covens.ts
    additions: 79
    deletions: 0
  - file: renderer/src/web/woke/mechanics/data.ts
    additions: 17
    deletions: 0
  - file: renderer/src/web/woke/mechanics/guide.ts
    additions: 6
    deletions: 0
  - file: renderer/src/web/woke/ui/game-icons.ts
    additions: 2
    deletions: 0
  - file: renderer/test/woke/economy.test.ts
    additions: 3
    deletions: 0
  - file: renderer/test/woke/mechanics-guide.test.ts
    additions: 15
    deletions: 0
---
> **TL;DR** Type the `woke-request` IPC channel: one op map in `ipc/types.ts` drives both `hostRequest` and the main handler table, so a typo or wrong argument fails typecheck instead of at run time. No behaviour change.

Review finding C2. About 60 operations go through `CLIENT->MAIN::woke-request` with a string `op` and `any` args (`main/src/woke/index.ts`, `renderer/src/web/woke/shared/host.ts`). A typo or changed argument only fails at run time.

Do: one map of op name to `{ args, result }` in `ipc/types.ts`; `hostRequest` and the handler table both typed from it. No behaviour change.

## Acceptance criteria
- [ ] `ipc/types.ts` has one op map (op name to `{ args, result }`) covering every `woke-request` op
- [ ] `hostRequest` in the renderer and the main handler table are both typed from that map; no `any` args left on the channel
- [ ] A wrong op name or argument shape fails typecheck
- [ ] No behaviour change: typecheck, lint, unit tests and build pass
