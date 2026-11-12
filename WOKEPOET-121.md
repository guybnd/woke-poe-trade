---
id: WOKEPOET-121
title: Release build splits files across two draft releases
status: Done
priority: Medium
effort: S
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-06T02:01:17.856Z'
    comment: Created ticket.
    id: a-2026-11-06t02-01-17-856z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T05:24:38.824Z'
  - type: comment
    user: Agent
    comment: >-
      Already fixed by #322 (the release workflow now drafts first and checks
      for exactly one draft); v0.4.1 and v0.4.2 each made a single release. The
      three old stray drafts (436003962 for v0.1.0, 436180413 for v0.2.0,
      436388427 for v0.3.0) are still on GitHub and only collaborators can see
      them. Guy can delete them; auto mode won't let me.
    date: '2026-11-12T05:24:40.011Z'
    selfAttested: true
    id: c-2026-11-12t05-24-40-011z
needsAction: null
---
> **TL;DR:** The release build for v0.1.0 made two drafts for one tag, so one file landed in the wrong draft. Fix this before the next release, because a misplaced `latest.yml` or installer would break updates.

Seen in run 42147088430: the nsis and portable targets upload at the same time, and each created a draft for v0.1.0. Draft 436003962 got only the installer's blockmap; 436003964 got everything else. I copied the blockmap across by hand before publishing.

Likely fix: in `.github/workflows/release.yml`, create the draft first and let electron-builder upload into it, or publish the two targets one after the other. Confirm with a throwaway tag.

Stray draft 436003962 is still on GitHub, visible only to repo collaborators. It's safe for Guy to delete.
