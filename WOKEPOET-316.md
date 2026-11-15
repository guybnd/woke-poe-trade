---
id: WOKEPOET-316
title: 'Character: mod tiers and roll % in build and character tooltips'
status: Grooming
priority: None
effort: None
assignee: unassigned
tags:
  - pob
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-304
history:
  - type: activity
    user: Agent
    date: '2026-11-15T06:27:48.854Z'
    comment: Created as subtask of WOKEPOET-304.
---
Follow-up to WOKEPOET-314. No tier data in the app (stats.ndjson has no tiers; affix caps read advanced copy text). Add a RePoE/poedb 3.30 mod-tier JSON under public/data (lazy-loaded, run bump-data-version), match PoB/character mod lines to tiers by stat text + item class + values, show "T3 · 82%" like the listing tooltip (layout J). Keep perf within budget.
