---
id: WOKEPOET-386
title: 'F4: make stash-optin.test.ts independent of timing'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - testing
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-380
history:
  - type: activity
    user: Agent
    date: '2026-11-18T15:25:56.295Z'
    comment: Created as subtask of WOKEPOET-380.
---
renderer/test/woke/stash-optin.test.ts: 3 failures in a local run 2026-11-19 under load (20 s timeout on "unlocking shows the row", then follow-on failures). Remove the real-time dependency.
