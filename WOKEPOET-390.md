---
id: WOKEPOET-390
title: 'G4: AppUpdater unit tests'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - testing
  - tooling
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:26:03.700Z'
    comment: Created as subtask of WOKEPOET-380.
---
main/src/AppUpdater.ts is 512 lines with no tests and is faked in the fake-game host. Releases broke before (WOKEPOET-121, 170). Test its states with electron-updater mocked.
