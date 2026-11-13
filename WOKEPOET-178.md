---
id: WOKEPOET-178
title: Type the woke-request channel between overlay and main
status: Todo
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
needsAction: null
---
> **TL;DR** Type the `woke-request` IPC channel: one op map in `ipc/types.ts` drives both `hostRequest` and the main handler table, so a typo or wrong argument fails typecheck instead of at run time. No behaviour change.

Review finding C2. About 60 operations go through `CLIENT->MAIN::woke-request` with a string `op` and `any` args (`main/src/woke/index.ts`, `renderer/src/web/woke/shared/host.ts`). A typo or changed argument only fails at run time.

Do: one map of op name to `{ args, result }` in `ipc/types.ts`; `hostRequest` and the handler table both typed from it. No behaviour change.

## Acceptance criteria
- [ ] `ipc/types.ts` has one op map (op name to `{ args, result }`) covering every `woke-request` op
- [ ] `hostRequest` in the renderer and the main handler table are both typed from that map; no `any` args left on the channel
- [ ] A wrong op name or argument shape fails typecheck
- [ ] No behaviour change: typecheck, lint, unit tests and build pass
