---
id: WOKEPOET-180
title: 'Housekeeping from the review: branches, npm updates, nosniff, lint warnings'
status: Grooming
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
    comment: Created as subtask of WOKEPOET-168.
---
Review finding C4.
- 149 branches on GitHub; delete the merged ones (needs Guy's OK, deletion can't be undone easily). 60+ `woke-*` clone folders in `E:\Git`: list which are safe to remove, Guy deletes.
- Three leftover duplicate draft releases (0.1.0, 0.2.0, 0.3.0): covered by WOKEPOET-121, delete the drafts there.
- `.github/dependabot.yml` only watches GitHub Actions; add npm for `main/`, `renderer/`, `testing/` (monthly, grouped).
- `main/src/host-files/request-guard.ts` `sendFile`: add `X-Content-Type-Options: nosniff`; uploads keep the URL's extension and are served without a content type.
- 4 lint warnings (unused eslint-disable in `price-check/trade/RateLimiter.ts` and `common.ts`).
- TypeScript 6.0 in `main/`, 5.6 in `renderer/`: align.
- 72 empty catch blocks and 113 silent `.catch(() => {})`: log the ones on save and file paths.
