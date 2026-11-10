---
id: WOKEPOET-170
title: 'Installer can''t be built: app-builder-lib patch is stale since #271'
status: In Progress
priority: Critical
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
    date: '2026-11-10T02:55:30.258Z'
    comment: Created ticket.
    id: a-2026-11-10t02-55-30-258z
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:30.258Z'
    comment: Created as subtask of WOKEPOET-168.
    id: a-2026-11-10t02-55-30-258z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-10T03:16:00.325Z'
  - type: activity
    user: Agent
    date: '2026-11-10T03:24:47.957Z'
    comment: >-
      PR #295: dropped the stale patch with Linux/macOS targets and
      patch-package; added 7zip-bin (electron-builder 26.18 dropped it,
      fetch-ocr failed). Local CI=true npm ci exits 0 and the Windows package
      builds (Setup + portable 0.4.0 with OCR). Awaiting merge.
    id: a-2026-11-10t03-24-47-957z
needsAction: null
---
Review finding A1. #271 moved `app-builder-lib` to 26.18.0; `main/build/app-builder-lib+26.8.1.patch` is for 26.8.1 and no longer applies. patch-package only warns locally but exits 1 when `CI=true`, so `npm ci` in `main/` fails on GitHub runners (seen in the Build workflow's Linux job; reproduced the patch failure on GUY-PC). Master is 0.4.0, newest release is 0.3.0; tagging v0.4.0 would very likely fail at install.

Fix: regenerate the patch for 26.18.0 (it only touches `targets/appimage/appImageUtil.js`), or drop the patch together with the Linux and macOS targets if Windows is the only target (see the Build workflow ticket).

Done when: `CI=true npm ci` in `main/` exits 0 and `npm run package -- --win -p never` produces the installer.
