---
id: WOKEPOET-187
title: 'Regex library: edit, create, delete in window; poe.re in app browser'
status: Done
priority: None
effort: None
assignee: unassigned
tags:
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-10T12:30:42.858Z'
    comment: Created ticket.
    id: a-2026-11-10t12-30-42-858z
  - type: comment
    user: Agent
    comment: >-
      Mocks: https://claude.ai/artifact/NncJ8n3ZoUwHdPZKS74KpV. Pick one edit
      style (A row buttons + in-place form, B edit mode switch, C edit page) and
      one poe.re option (P1 tab in the library window with Save bar, P2 separate
      in-app window). Recommended A + P1.
    date: '2026-11-10T12:32:22.738Z'
    id: c-2026-11-10t12-32-22-738z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-10T12:32:22.738Z'
    comment: >-
      Mocks: https://claude.ai/artifact/NncJ8n3ZoUwHdPZKS74KpV. Pick one edit
      style (A row buttons + in-place form, B edit mode switch, C edit page) and
      one poe.re option (P1 tab in the library window with Save bar, P2 separate
      in-app window). Recommended A + P1.
  - type: comment
    user: Agent
    comment: >-
      Guy picked A + P2. Built on branch claude/regex-library-edit; review
      running.
    date: '2026-11-10T12:53:19.871Z'
    id: c-2026-11-10t12-53-19-871z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-10T12:53:19.871Z'
    comment: >-
      Guy picked A + P2. Built on branch claude/regex-library-edit; review
      running.
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-10T12:53:20.268Z'
  - type: activity
    user: Agent
    date: '2026-11-10T13:21:48.333Z'
    comment: >-
      PR #321 is up to date. The review fixes and perf trims are in, and local
      typecheck, lint, unit, perf and e2e pass. The one tab-rail failure also
      fails on master. The PR is handed to the merge thread.
    id: a-2026-11-10t13-21-48-333z
  - type: comment
    user: Agent
    comment: >-
      Already merged as #321 (Regex library: edit, add and delete in the window;
      poe.re in the app).
    date: '2026-11-12T06:21:33.948Z'
    completionComment: true
    id: c-2026-11-12t06-21-33-948z
  - type: status_change
    from: In Progress
    to: Done
    user: Agent
    date: '2026-11-12T06:21:33.948Z'
swimlane: null
needsAction: null
---
Guy: the Regex library window has no visible create/edit/delete, and "Generate on poe.re" opens the external browser.

Today: delete is hidden in the row right-click menu and Del key; create/edit only in Settings › Regex library. App has webviews (Lab, wiki, trade) and Lab/Challenges read pages via executeJavaScript.

Plan: mocks with pick buttons first, then build: inline add/edit/delete in the window, poe.re in an in-app webview with "Save to library" that reads the generated string (page result or clipboard).
