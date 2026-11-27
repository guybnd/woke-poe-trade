---
id: WOKEPOET-97
title: 'Dev launcher: Stop-Dev should find orphaned launchers'
status: Released
priority: Low
effort: XS
assignee: unassigned
tags:
  - tooling
createdBy: Agent
updatedBy: Guy
history:
  - type: activity
    user: Agent
    date: '2026-11-05T11:58:53.017Z'
    comment: Created ticket.
    id: a-2026-11-05t11-58-53-017z
  - type: comment
    user: Agent
    comment: >-
      Merged as #361 (f54265a5) and installed to E:\Git\woke-dev.ps1; the old
      copy is backed up in .woke-dev. Stop-Dev now stops leftover launchers, and
      a held main.log names the cause.
    date: '2026-11-12T06:32:54.572Z'
    completionComment: true
    id: c-2026-11-12t06-32-54-572z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T06:32:54.572Z'
  - type: status_change
    from: Done
    to: Released
    user: Guy
    date: '2026-11-27T16:11:34.317Z'
needsAction: null
version: '0000234'
releasedAt: '2026-11-27T16:11:26.816Z'
releaseDocPath: release-notes/0000234
---
Seen 2026-11-05: the dev copy's Electron exited, but its launcher `cmd.exe` and `node build\script.mjs` stayed alive. main.pid pointed at another process, so Stop-Dev missed them. The orphan kept E:\Git\.woke-dev\main.log open, and `woke-dev.cmd master` then failed with "the app did not start ... Another copy may hold the single-instance lock", which was misleading.

Done when: Stop-Dev also finds and stops any `build\script.mjs` running from the dev folder and its parent `cmd.exe`, and the error names the real cause when the log is held. Refresh E:\Git\woke-dev.ps1 from the repo's scripts/ after merging.
