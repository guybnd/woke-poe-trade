---
id: WOKEPOET-267
title: 'Loot filter safety tests: presets never mute NeverSink''s top drops'
status: Ready
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
needsAction: null
---
> **TL;DR** A robust test suite proving our presets and edits never hide, mute or un-beam NeverSink's most valuable drops, on every strictness and style. Prompted by PR #426's bug (quiet/beams read t5r1 as "tier 5").

## Plan
- Pull the editor's compose pipeline out of store.ts into a pure function so tests run the real save path.
- Invariant tests on the real 8.21.0a fixtures, every strictness + the Vaal style: a catalogue of precious drops (Divine, Mirror, top uniques, T1 cards, tiered gear t5r1, etc.) keep show, sound, beam after every preset alone and in combinations (pairwise + all-on + random property runs).
- Round-trip: parse -> serialize is byte-stable on every fixture; presets off = untouched file.
- Plain-words report (generated markdown) of what's protected, checked in and kept fresh by a test.
- Timings.

Clone: E:\Git\woke-filter-tests, branch woke/filter-safety-tests (stacked on #426).
