---
id: WOKEPOET-725
title: 'Filter editor: preview the game''s real alert sounds'
status: Done
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
  - type: comment
    user: Agent
    comment: >-
      PR 1104 merged (96181c59a) after adversarial review and green CI. The
      picker plays the game's alert sounds 1-16 and the Sh sounds.
    date: '2026-11-28T11:44:31.273Z'
    completionComment: true
    id: c-2026-11-28t11-44-31-273z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-28T11:44:31.273Z'
  - type: comment
    user: Agent
    comment: >-
      Merged (96181c59a). The sound picker and Preview tab play the game's own
      alert sounds 1-16 and the Sh sounds, decoded on the player's PC from
      FMOD/Desktop/ItemFilter.bank with the install's fmod.dll. Open for Guy:
      FMOD/GGG terms for calling the game's fmod.dll; the 1-16 mapping isn't
      checked by ear yet.
    completionComment: true
    date: '2026-11-28T11:44:41.990Z'
    id: c-2026-11-28t11-44-41-990z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-28T11:44:42.967Z'
needsAction: null
reviewState: approved
baselineCommit: 8289be3944ec8e037ccf214e1ae02b1146f21d66
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/1104'
swimlane: null
diffSummary:
  - file: release-next-notes.md
    additions: 1
    deletions: 0
  - file: renderer/src/web/woke/loot-filter/CurrencyCard.vue
    additions: 3
    deletions: 2
  - file: renderer/src/web/woke/loot-filter/currency-weights.ts
    additions: 83
    deletions: 17
  - file: renderer/src/web/woke/loot-filter/unique-classes.ts
    additions: 8
    deletions: 2
  - file: renderer/test/woke/filter-loot-special-rolls.test.ts
    additions: 45
    deletions: 6
---
> **TL;DR** The sound picker plays the game's own PlayAlertSound 1-16 and Sh sounds, decoded on the player's PC from their PoE install's FMOD/Desktop/ItemFilter.bank with the game's own fmod.dll. Nothing of GGG's is shipped.

Route: ItemFilter.bank holds an FSB5 (Vorbis) with AlertSound_01..16 and SH22Alchemy..Mirror. A PowerShell + C# P/Invoke helper loads the install's fmod.dll, decodes each sample to 16-bit WAV in the app's cache, once per bank version.
