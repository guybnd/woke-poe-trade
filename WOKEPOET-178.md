---
id: WOKEPOET-178
title: Type the woke-request channel between overlay and main
status: Grooming
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
    comment: Created as subtask of WOKEPOET-168.
---
Review finding C2. About 60 operations go through `CLIENT->MAIN::woke-request` with a string `op` and `any` args (`main/src/woke/index.ts`, `renderer/src/web/woke/shared/host.ts`). A typo or changed argument only fails at run time.

Do: one map of op name to `{ args, result }` in `ipc/types.ts`; `hostRequest` and the handler table both typed from it. No behaviour change.
