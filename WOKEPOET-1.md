---
id: WOKEPOET-1
title: Enable GitHub Actions so packaging can ship
status: Archived
priority: None
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T02:07:47.099Z'
    comment: Created ticket.
    id: a-2026-11-05t02-07-47-099z
  - type: comment
    user: Agent
    comment: >-
      **GitHub Actions is already enabled**, so the remaining blocker is your
      call on signing. **Should the first release be unsigned, or do you want
      code-signing set up first?**


      - **Unsigned first (recommended):** no secrets needed. Pushing a `v*` tag
      that matches `main/package.json` builds the installer into a draft
      release, and you press Publish. Players get a Windows SmartScreen warning.

      - **Sign first:** you buy a code-signing certificate and add it as repo
      secrets, and I add the signing step to `release.yml`. No SmartScreen
      warning long term, but it costs money and delays the first release.


      Default if you have no preference: unsigned first, add signing later.
    date: '2026-11-05T02:08:05.150Z'
    id: c-2026-11-05t02-08-05-150z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-05T02:08:05.150Z'
    comment: >-
      **GitHub Actions is already enabled**, so the remaining blocker is your
      call on signing. **Should the first release be unsigned, or do you want
      code-signing set up first?**


      - **Unsigned first (recommended):** no secrets needed. Pushing a `v*` tag
      that matches `main/package.json` builds the installer into a draft
      release, and you press Publish. Players get a Windows SmartScreen warning.

      - **Sign first:** you buy a code-signing certificate and add it as repo
      secrets, and I add the signing step to `release.yml`. No SmartScreen
      warning long term, but it costs money and delays the first release.


      Default if you have no preference: unsigned first, add signing later.
  - type: comment
    user: Agent
    comment: Actions already enabled; the signing question lives on WOKEPOET-53.
    date: '2026-11-12T00:17:36.490Z'
    id: c-2026-11-12t00-17-36-490z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-12T00:17:36.490Z'
  - type: status_change
    from: Grooming
    to: Archived
    user: Agent
    date: '2026-11-12T00:17:36.490Z'
swimlane: null
needsAction: null
---
> **TL;DR** — Player **packaging** (installer, auto-update, crash reports, setup wizard) needs a working **release pipeline** on guybnd/woke-poe-trade. Done looks like a **first installer built by CI** and sitting on a GitHub release.

## Context
- Mockups: https://claude.ai/artifact/LEJanQ1N43t4jSTYYgG1Hr (options A1/C1/U1 chosen).
- This ticket was filed as "blocked because Actions and release secrets need enabling".

## Checked 2026-11-05 (repo state differs from that premise)
- **Actions are already enabled**: `actions/permissions` reports `enabled: true`, `allowed_actions: all`. Tests, Build, Docs, Release and Tauri workflows are all active, and Tests runs on PRs.
- **`.github/workflows/release.yml` has never run** and the repo has **no releases**.
- It triggers on a `v*` tag matching `main/package.json` version (or manually), and `main/electron-builder.yml` publishes to a **draft** release that someone must press Publish on.
- It only needs the built-in `GITHUB_TOKEN`. The repo has **no secrets** and the workflow has **no code-signing** step, so installers would be unsigned (Windows SmartScreen warning).
