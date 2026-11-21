---
id: WOKEPOET-455
title: 'Ctrl+Space search finds settings (Open settings, pages, each setting)'
status: In Progress
priority: High
effort: None
assignee: unassigned
tags:
  - search
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-21T11:57:44.881Z'
    comment: Created ticket.
---
Guy typed "settings" into Ctrl+Space and got only poewiki/poedb web rows. Settings pages were matched only by their own names and there was no "Open settings" entry.

Fix: "settings" lists Open settings + every page; setting labels (pages' `find` lists, same index as Settings Ctrl+F) jump to their page and flash the row. PR https://github.com/guybnd/woke-poe-trade/pull/734
