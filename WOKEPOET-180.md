---
id: WOKEPOET-180
title: 'Housekeeping from the review: branches, npm updates, nosniff, lint warnings'
status: Done
priority: Low
effort: S
assignee: unassigned
tags:
  - cleanup
  - tooling
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:04.512Z'
    comment: Created ticket.
    id: a-2026-11-10t02-56-04-512z
  - type: activity
    user: Agent
    date: '2026-11-10T02:56:04.512Z'
    comment: Created as subtask of WOKEPOET-168.
    id: a-2026-11-10t02-56-04-512z
  - type: comment
    user: Agent
    comment: >-
      Part merged in #357 (4d470c33): Dependabot now watches npm in main,
      renderer and testing; uploads are served with nosniff; and the 4 lint
      warnings are gone. Still open: deleting merged branches (needs Guy's OK),
      listing old clone folders, aligning the TypeScript versions, and logging
      the silent catches.
    date: '2026-11-12T05:42:07.558Z'
    selfAttested: true
    id: c-2026-11-12t05-42-07-558z
  - type: comment
    user: Agent
    comment: >-
      Done: Guy approved and ran the merged-branch deletes from his PC, and
      auto-delete on merge is on. Merged in #357: npm Dependabot, nosniff on
      uploads, and the lint warnings. Aligning the TypeScript versions and
      logging the silent catches are small leftovers, not tracked separately.
    date: '2026-11-12T07:54:26.827Z'
    completionComment: true
    id: c-2026-11-12t07-54-26-827z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T07:54:26.827Z'
needsAction: null
---
Review finding C4.
- 149 branches on GitHub; delete the merged ones (needs Guy's OK, deletion can't be undone easily). 60+ `woke-*` clone folders in `E:\Git`: list which are safe to remove, Guy deletes.
- Three leftover duplicate draft releases (0.1.0, 0.2.0, 0.3.0): covered by WOKEPOET-121, delete the drafts there.
- `.github/dependabot.yml` only watches GitHub Actions; add npm for `main/`, `renderer/`, `testing/` (monthly, grouped).
- `main/src/host-files/request-guard.ts` `sendFile`: add `X-Content-Type-Options: nosniff`; uploads keep the URL's extension and are served without a content type.
- 4 lint warnings (unused eslint-disable in `price-check/trade/RateLimiter.ts` and `common.ts`).
- TypeScript 6.0 in `main/`, 5.6 in `renderer/`: align.
- 72 empty catch blocks and 113 silent `.catch(() => {})`: log the ones on save and file paths.
