---
id: WOKEPOET-137
title: 'Release after v0.1.0, with landing and README updated for what''s new'
status: Done
priority: High
effort: M
assignee: unassigned
tags: []
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-06T05:57:15.259Z'
    comment: Created ticket.
    id: a-2026-11-06t05-57-15-259z
  - type: activity
    user: Agent
    date: '2026-11-06T06:06:15.448Z'
    comment: >-
      PR #227 up on branch landing-next-release with the landing and README
      updates, including #226. Held for the shopping list and compare view PR.
      Then: its slide, bump main/package.json to 0.2.0, adversarial review,
      merge via the cloud route once CI passes, tag by commit sha, check both
      drafts, publish.
    id: a-2026-11-06t06-06-15-448z
  - type: comment
    user: Agent
    comment: >-
      v0.2.0 published from 4e75820f with installer, portable, latest.yml and
      blockmap. Landing and README updated by PR #229 and live. latest.yml's
      sha512 matches the installer, and the packaged app holds the new features;
      the installer was not launched. Stray drafts 436180413 and 436003962
      remain for Guy to delete.
    date: '2026-11-06T06:40:00.644Z'
    completionComment: true
    id: c-2026-11-06t06-40-00-644z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-06T06:40:00.644Z'
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-12T00:17:16.875Z'
needsAction: null
reviewState: null
---
Guy asked for a new public Windows installer release after v0.1.0, made the same way (DEVELOPING.md), and the landing and features pages updated for what's new: stash tab reading #215, tooltip views #216/#217, number fields #213, corrupted chip #214, PoB #218 #219 #221 #225 (and #226 plus the shopping list PR if they land first), drop counter #222, death recap #220.

Clone: E:\Git\woke-release. New slides use the real overlay via testing/e2e/landing-highlights.spec.ts.
