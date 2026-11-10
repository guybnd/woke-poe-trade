---
id: WOKEPOET-187
title: 'Regex library: edit, create, delete in window; poe.re in app browser'
status: Grooming
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
---
Guy: the Regex library window has no visible create/edit/delete, and "Generate on poe.re" opens the external browser.

Today: delete is hidden in the row right-click menu and Del key; create/edit only in Settings › Regex library. App has webviews (Lab, wiki, trade) and Lab/Challenges read pages via executeJavaScript.

Plan: mocks with pick buttons first, then build: inline add/edit/delete in the window, poe.re in an in-app webview with "Save to library" that reads the generated string (page result or clipboard).
