---
id: WOKEPOET-653
title: Let players report issues without a GitHub account
status: Backlog
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
  - ux
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-27T04:32:51.762Z'
    comment: Created ticket.
    id: a-2026-11-27t04-32-51-762z
  - type: activity
    user: Agent
    date: '2026-11-27T04:33:08.226Z'
    comment: Updated title. Updated description. Updated tags.
    id: a-2026-11-27t04-33-08-226z
  - type: status_change
    from: Todo
    to: Backlog
    user: Agent
    date: '2026-11-27T04:33:08.713Z'
needsAction: null
---
Parked by Guy on 2026-11-27, to return to later. Thread: https://claude.ai/code/project/chan_01TFAVQEVFL8KKQ8fhVfpfJo?thread=cmsg_01TFAVQEVFL8KKQ8fhVfpfJoEX1y1xXTx5uCcWnucrXKyX

## Problem
Report an issue (PR https://github.com/guybnd/woke-poe-trade/pull/743, WOKEPOET-462) opens a prefilled GitHub issue, so a player needs a GitHub login to send one.

## Options
Options page with pick buttons: https://claude.ai/artifact/7JabNpkHmdAEGbDypzZnuk (no picks yet).

Recommended:
- **A1:** a small relay on Vercel that holds the GitHub key. It rate-limits per install and IP (5/h, 20/day), caps the size, strips @mentions and links, and labels issues "from app".
- **B1:** issues are filed by a GitHub App bot (woke-reports[bot]).
- **C1:** the form gets "Send report" and an optional contact field. It keeps "Open on GitHub instead", and falls back to it automatically when the relay is down.

Alternatives:
- **A2:** a Cloudflare Worker.
- **A3:** a Discord channel through the relay. The webhook URL must never ship in the app.
- **A4:** a prefilled Google Form.

## Rules
- No token may ever ship in the app.
- The new host must be added to the network list in SECURITY.md.

## Guy's setup for the recommendation
- Approve a new Vercel project.
- Create the GitHub App and paste its ID and key into the Vercel env.

## Also open
- [ ] Create a "crash" label on the repo. Crash reports ask for it, but it doesn't exist, so GitHub drops it. Needs Guy's yes: `gh label create crash -R guybnd/woke-poe-trade --color B60205 --description "App crash report"`
- [ ] An on-screen check of the form while PoE is closed: layout, dragging, Esc, Preview, Cancel. On the dev build (5ed04982), the Settings row, the Ctrl+Space command and the preview were already checked over CDP.
