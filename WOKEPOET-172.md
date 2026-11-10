---
id: WOKEPOET-172
title: 'Crash Report and help links go to GitHub Issues, which are off'
status: Grooming
priority: High
effort: XS
assignee: unassigned
tags:
  - bug
  - docs
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-168
history:
  - type: activity
    user: Agent
    date: '2026-11-10T02:55:37.526Z'
    comment: Created as subtask of WOKEPOET-168.
---
Review finding A4. Issues and Discussions are disabled on guybnd/woke-poe-trade, but these send players to `/issues/new`:
- `main/src/woke/crash-reports.ts:12` (`ISSUES_URL`, the crash Report button)
- `docs/issues.md:29`
- README privacy section ("Report opens a GitHub issue")
- SECURITY.md mentions the same flow

Decision for Guy: switch Issues on (fits the pre-filled crash report), or point all of them at the Discord the About page uses (#181). Recommended: switch Issues on.
