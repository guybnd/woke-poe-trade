---
id: WOKEPOET-461
title: Check for updates button (Settings > Install & updates) + Ctrl+Space command
status: In Progress
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T14:30:24.698Z'
    comment: Created ticket.
---
Add a "Check for updates" button next to the Version row on the Install page, and a matching Ctrl+Space search command.

- Auto-update builds: trigger electron-updater check, show inline status.
- Portable/dev: query GitHub releases latest, compare to app version, show Up to date / vX available + Download link.
- Unit tests for version compare and result mapping; e2e if patterns exist.
