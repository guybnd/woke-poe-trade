---
id: WOKEPOET-267
title: 'Loot filter safety tests: presets never mute NeverSink''s top drops'
status: Grooming
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
    comment: Created as subtask of WOKEPOET-149.
---
> **TL;DR** A robust test suite proving our presets and edits never hide, mute or un-beam NeverSink's most valuable drops, on every strictness and style. Prompted by PR #426's bug (quiet/beams read t5r1 as "tier 5").

## Plan
- Pull the editor's compose pipeline out of store.ts into a pure function so tests run the real save path.
- Invariant tests on the real 8.21.0a fixtures, every strictness + the Vaal style: a catalogue of precious drops (Divine, Mirror, top uniques, T1 cards, tiered gear t5r1, etc.) keep show, sound, beam after every preset alone and in combinations (pairwise + all-on + random property runs).
- Round-trip: parse -> serialize is byte-stable on every fixture; presets off = untouched file.
- Plain-words report (generated markdown) of what's protected, checked in and kept fresh by a test.
- Timings.

Clone: E:\Git\woke-filter-tests, branch woke/filter-safety-tests (stacked on #426).
