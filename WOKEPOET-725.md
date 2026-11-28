---
id: WOKEPOET-725
title: 'Filter editor: preview the game''s real alert sounds'
status: In Progress
priority: Medium
effort: M
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-28T10:55:24.587Z'
    comment: Created ticket.
    id: a-2026-11-28t10-55-24-587z
  - type: activity
    user: Agent
    date: '2026-11-28T11:08:12.382Z'
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/1104 opened; adversarial
      review findings fixed (322e7178d). Waiting on CI. Open for Guy: FMOD/GGG
      terms for calling the game's fmod.dll; 1-16 mapping not checked by ear.
    id: a-2026-11-28t11-08-12-382z
---
> **TL;DR** The sound picker plays the game's own PlayAlertSound 1-16 and Sh sounds, decoded on the player's PC from their PoE install's FMOD/Desktop/ItemFilter.bank with the game's own fmod.dll. Nothing of GGG's is shipped.

Route: ItemFilter.bank holds an FSB5 (Vorbis) with AlertSound_01..16 and SH22Alchemy..Mirror. A PowerShell + C# P/Invoke helper loads the install's fmod.dll, decodes each sample to 16-bit WAV in the app's cache, once per bank version.
