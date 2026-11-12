---
id: WOKEPOET-8
title: Show the challenge guide in the overlay on a hotkey
status: Done
priority: None
effort: S
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T02:20:22.815Z'
    comment: Created ticket.
    id: a-2026-11-05t02-20-22-815z
  - type: activity
    user: Agent
    date: '2026-11-05T02:26:10.606Z'
    comment: Updated description. Changed effort to S.
    id: a-2026-11-05t02-26-10-606z
  - type: comment
    user: Agent
    comment: >-
      Mockups: https://claude.ai/artifact/WE3oQ8S11FuyN4dbrkL3JK


      1. Which option: A (site as it is), B (site fitted to the toolkit, with
      progress header and optional hover icon) or C (native tracker)? Proposed
      default: B.

      2. Should the hotkey let you click right away (scroll and tick, then
      hotkey or Esc back to the game), or open click-through like the lab page?
      Proposed default: click right away.
    date: '2026-11-05T02:26:13.563Z'
    id: c-2026-11-05t02-26-13-563z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T02:26:13.563Z'
    comment: >-
      Mockups: https://claude.ai/artifact/WE3oQ8S11FuyN4dbrkL3JK


      1. Which option: A (site as it is), B (site fitted to the toolkit, with
      progress header and optional hover icon) or C (native tracker)? Proposed
      default: B.

      2. Should the hotkey let you click right away (scroll and tick, then
      hotkey or Esc back to the game), or open click-through like the lab page?
      Proposed default: click right away.
  - type: comment
    user: Agent
    comment: >-
      Guy picked B and asked how to jump to a specific challenge from the game's
      window and sync progress. Findings: Client.txt (245 MB on Guy's PC) has no
      challenge completion lines. The official page
      https://www.pathofexile.com/account/view-profile/<account with # as
      ->/challenges loads with no login in a webview (curl gets a 403): 40
      `.achievement` rows, `h2` name, `.completion-detail` N/M, class
      `incomplete` on unfinished rows. Tested on one public ladder account with
      0 of 40, so a finished row and a private profile are unverified. Guy's
      accountName is blank in config. Guide anchors are in league-toc.txt, such
      as #3peddlersproducei; tick via the site's `.complete[data-challenge=N]`
      click. Proposed: list with filter, one-way sync on open or Sync button,
      read-from-screen hotkey as a follow-up.
    date: '2026-11-05T02:55:33.000Z'
    selfAttested: true
    summary: >-
      Guy picked B. Sync source found: official profile challenges page readable
      in a webview; log has nothing. Finished rows and private profiles
      unverified; account name blank. Proposed list, one-way sync, OCR hotkey
      later.
    id: c-2026-11-05t02-55-33-000z
  - type: comment
    user: Agent
    comment: >-
      Guy picked B and approved list plus sync. Hotkey takes focus, per the
      recommended default.
    date: '2026-11-05T03:39:14.506Z'
    id: c-2026-11-05t03-39-14-506z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-05T03:39:14.506Z'
    comment: >-
      Guy picked B and approved list plus sync. Hotkey takes focus, per the
      recommended default.
  - type: activity
    user: Agent
    date: '2026-11-05T03:39:14.953Z'
    comment: Updated implementation link.
    id: a-2026-11-05t03-39-14-953z
  - type: comment
    user: Agent
    comment: >-
      PR #88 is up: guide panel, list, one-way profile sync, account name
      prompts, optional dock icon, unit tests. Verified in Electron with a
      stand-in host against live pages. Not verified: settings page prompt
      rendering, real hotkey and focus in game, private profile message in the
      running panel. Hover screen-reading hotkey is a follow-up.
    date: '2026-11-05T03:39:16.652Z'
    completionComment: true
    id: c-2026-11-05t03-39-16-652z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-05T03:39:16.653Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:16:41.723Z'
swimlane: null
needsAction: null
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/88'
reviewState: null
---
> **TL;DR** A hotkey shows CraniumCarnage's challenge guide (https://craniumviolence.github.io/) in an overlay panel. It embeds fine in a webview; waiting on Guy's pick from the mockups before building.

Tested in a real Electron `<webview>` with the default session: no load errors, 40 tick boxes, 276 prices, ticks survive an app restart (site uses localStorage).

Constraints for any embed option:
- Start with the site's side list closed. It opens by default and covers the text. The site's `data-sidebar` value is inverted: `visible` means closed.
- Keep the panel wider than 770px, because the site's narrow CSS makes the text much larger.

Reuse: `lab/WidgetLab.vue` (webview panel, `widget-action` hotkey), `shortcuts.ts`, `settings/hotkey-fields.ts`, `modules.ts`, `DockItem`. `trigger-event` already supports `focusOverlay` to take focus on the hotkey.

Project rules: nothing permanently on screen (hover icon or hotkey popup only); a test ships with the feature.
