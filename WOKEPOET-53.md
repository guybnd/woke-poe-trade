---
id: WOKEPOET-53
title: 'Updates: prompt when the game is closed, rollback, signing, log errors'
status: Grooming
priority: Medium
effort: L
assignee: unassigned
tags:
  - feature
  - overlay-core
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-36
history:
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:00.136Z'
    comment: Created ticket.
    id: a-2026-11-05t08-10-00-136z
  - type: activity
    user: Agent
    date: '2026-11-05T08:10:00.136Z'
    comment: Created as subtask of WOKEPOET-36.
    id: a-2026-11-05t08-10-00-136z
  - type: comment
    user: Agent
    comment: >-
      Update error logging merged in #150. Still open: prompting when the game
      is closed, rollback, and signing (Guy's decision, since it costs money).
    date: '2026-11-05T11:08:35.574Z'
    selfAttested: true
    id: c-2026-11-05t11-08-35-574z
  - type: comment
    user: Agent
    comment: >-
      From the project review (WOKEPOET-168, finding B3): no signing secrets are
      set on the repo (`WIN_CSC_LINK` is empty), so the installer and
      auto-updates are unsigned and SmartScreen warns. Decision for Guy: buy
      signing (Azure Trusted Signing is the cheap route) or say on the download
      page that the warning is expected.
    date: '2026-11-10T02:56:31.237Z'
    selfAttested: true
    id: c-2026-11-10t02-56-31-237z
  - type: comment
    user: Agent
    comment: >-
      Guy 2026-11-13: not buying code signing. Instead the download page
      (README, landing page or release notes, wherever players download) gets
      one line on SmartScreen: "More info > Run anyway". Signing decision
      closed. Still open here: prompting while the game is closed, and rollback.
    date: '2026-11-13T03:02:28.376Z'
    selfAttested: true
    pin: true
    id: c-2026-11-13t03-02-28-376z
subtasks:
  - WOKEPOET-260
---
> **TL;DR** C8. Update timing is fine, but there's no way back from a bad release, no code signing, update errors aren't logged (AppUpdater.ts), and it installs only on quit, which tray apps rarely do. Signing costs money, so that part is Guy's decision. Consider replacing the PowerShell call in runningGameLog, which antivirus tools dislike. Logging the error is an easy first step.
