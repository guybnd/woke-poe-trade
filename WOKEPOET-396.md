---
id: WOKEPOET-396
title: 'Shorter test runs: shards, caching, and PRs run only what they touch'
status: Grooming
priority: Medium
effort: None
assignee: unassigned
tags:
  - testing
  - tooling
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-18T16:26:14.818Z'
    comment: Created ticket.
---
Round 2 of the test work (artifact https://claude.ai/artifact/H5EBYxP1wZR5hB3wNkZEKq). Guy approved all: S1 split big specs across shards, S2 four shards, S3 cache installs + build once, R1 PRs run overlay specs for changed modules only (shared code runs all), R2 PRs run related unit tests only, Q1 test/docs-only PRs skip fake-game, Q2 woke-check local runs the same subset. Full suite stays on master pushes and releases (Guy). Keep the "Fake-game tests" check name. Target: ~4 min every PR, ~2.5 min one-module PRs (today ~7).
