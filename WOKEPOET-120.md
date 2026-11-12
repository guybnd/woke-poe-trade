---
id: WOKEPOET-120
title: Publish first public Windows release from master
status: Done
priority: High
effort: S
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-06T01:55:11.935Z'
    comment: Created ticket.
    id: a-2026-11-06t01-55-11-935z
  - type: activity
    user: Agent
    date: '2026-11-06T01:56:39.495Z'
    comment: >-
      Master 601fc25f: required CI and Windows package green. Pushed tag v0.1.0
      at that commit; release build run 42147088430 running. The local clone has
      an unrelated upstream v0.1.0 tag from 2020, left alone.
    id: a-2026-11-06t01-56-39-495z
  - type: activity
    user: Agent
    date: '2026-11-06T02:01:38.307Z'
    comment: Updated implementation link.
    id: a-2026-11-06t02-01-38-307z
  - type: comment
    user: Agent
    comment: >-
      Published v0.1.0 from master 601fc25f. Checked: required CI green on that
      commit, latest.yml hash matches the installer, installer contents
      (version, GitHub feed guybnd/woke-poe-trade, OCR files, no dev URL or
      tokens), public download matches byte for byte, and the release is in the
      feed. Not done: the packaged app was not launched, because the dev copy
      was running; Guy should run the installer once when not playing. Installer
      is unsigned, so SmartScreen warns. The build split files across two
      drafts: follow-up WOKEPOET-121, and stray draft 436003962 is Guy's to
      delete.
    date: '2026-11-06T02:01:40.183Z'
    completionComment: true
    id: c-2026-11-06t02-01-40-183z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-06T02:01:40.183Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:17:15.717Z'
implementationLink: 'https://github.com/guybnd/woke-poe-trade/releases/tag/v0.1.0'
needsAction: null
reviewState: null
---
> **TL;DR:** Build the Windows installer from current master through release.yml as a draft release, check it without launching over PoE, then publish it.

The repo has no releases or v0.x tags yet, so this is the first one and `main/package.json` stays at 0.1.0. Publishing makes the installer public and starts the auto-update feed.

Steps: confirm CI on master, push tag v0.1.0, inspect the draft's assets (latest.yml hash, app-update.yml feed, version, bundled OCR), write notes, publish after Guy's go.
