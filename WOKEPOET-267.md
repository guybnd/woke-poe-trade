---
id: WOKEPOET-267
title: 'Loot filter safety tests: presets never mute NeverSink''s top drops'
status: Done
priority: High
effort: M
assignee: unassigned
tags:
  - bug
  - tooling
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-14T00:07:16.494Z'
    comment: Created ticket.
    id: a-2026-11-14t00-07-16-494z
  - type: activity
    user: Agent
    date: '2026-11-14T00:07:16.494Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-14t00-07-16-494z
  - type: comment
    user: Agent
    comment: >-
      PR https://github.com/guybnd/woke-poe-trade/pull/427 (branch
      woke/filter-safety-tests): guard suite plus two fixes it found (the
      6-socket preset muted 6-links; the weapons preset hid levelling 6-links).
      Report in docs/loot-filter-guard.md. vitest 3642/3642, lint, vue-tsc and
      build pass, adversarial review fixed. Open for Guy: should quiet/beams
      have a minimum of 2 tiers, and should a guard stop wrong prices from
      hiding red-beam drops. Waiting on merge via the cloud merge thread.
    date: '2026-11-14T00:38:17.568Z'
    completionComment: true
    id: c-2026-11-14t00-38-17-568z
  - type: status_change
    from: Grooming
    to: Ready
    user: Agent
    date: '2026-11-14T00:38:17.568Z'
  - type: comment
    user: Agent
    comment: >-
      Merged as 1baff5a4. Guard suite (compose.ts pipeline, every strictness +
      Vaal, 26 setups, 171 pairs, 200 random mixes, report
      docs/loot-filter-guard.md) plus fixes for the 6-socket preset muting
      6-links and the weapons preset hiding levelling 6-links. Open with Guy:
      quiet/beams minimum 2 tiers; price guard for red-beam drops.
    completionComment: true
    date: '2026-11-14T00:46:38.478Z'
    id: c-2026-11-14t00-46-38-478z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-14T00:46:38.957Z'
needsAction: null
baselineCommit: 407ba7f1f2c478fed465d0b71f60be15ccdb1be0
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/427'
swimlane: null
diffSummary:
  - file: testing/e2e/loot-filter.spec.ts
    additions: 1
    deletions: 1
---
> **TL;DR** A robust test suite proving our presets and edits never hide, mute or un-beam NeverSink's most valuable drops, on every strictness and style. Prompted by PR #426's bug (quiet/beams read t5r1 as "tier 5").

## Plan
- Pull the editor's compose pipeline out of store.ts into a pure function so tests run the real save path.
- Invariant tests on the real 8.21.0a fixtures, every strictness + the Vaal style: a catalogue of precious drops (Divine, Mirror, top uniques, T1 cards, tiered gear t5r1, etc.) keep show, sound, beam after every preset alone and in combinations (pairwise + all-on + random property runs).
- Round-trip: parse -> serialize is byte-stable on every fixture; presets off = untouched file.
- Plain-words report (generated markdown) of what's protected, checked in and kept fresh by a test.
- Timings.

Clone: E:\Git\woke-filter-tests, branch woke/filter-safety-tests (stacked on #426).
