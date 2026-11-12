---
id: WOKEPOET-88
title: 'Lab gems: complete the pool, default to random version, count every craft'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - bug
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T10:54:28.996Z'
    comment: Created ticket.
    id: a-2026-11-05t10-54-28-996z
  - type: comment
    user: Agent
    comment: >-
      Runner crafts and random default done in PR #171. Still open: the 6
      missing gems. Upstream GemCheck doesn't list them either, so colours and
      font availability are unverified.
    date: '2026-11-05T12:02:38.415Z'
    selfAttested: true
    id: c-2026-11-05t12-02-38-415z
  - type: comment
    user: Agent
    comment: >-
      Guy, 2026-11-12: Next. The "of Trarthus" gems aren't in the lab, in his
      view, so skip them. Add the 6 missing gems.
    date: '2026-11-12T05:23:57.197Z'
    selfAttested: true
    id: c-2026-11-12t05-23-57-197z
  - type: comment
    user: Agent
    comment: >-
      Merged as #362 (86006b20): the six missing transfigured gems are in the
      pool. The Trarthus gems stay out, per Guy.
    date: '2026-11-12T06:32:55.619Z'
    completionComment: true
    id: c-2026-11-12t06-32-55-619z
  - type: status_change
    from: Grooming
    to: Done
    user: Agent
    date: '2026-11-12T06:32:55.619Z'
needsAction: null
---
Step 6 of the [gameplay helpers critique](https://claude.ai/artifact/NjdEZhrQZBmKwRB56yTsoj). Thin prices in EV are already covered by WOKEPOET-79 / PR #152.

- Add Chain Hook of Angling, Divine Blast of Radiance, Frost Wall of Encroachment, Holy Hammers of Spirals, Holy Sweep of Hammerfalls, Reap of Butchery. Check whether the font gives the 12 "of Trarthus" gems.
- Default to random version: the wiki's sample shows the choose option on about 6 to 9% of Eternal font uses.
- Runner profit counts one craft. Eternal gives 2, a Gift 8, and the Darkshrine adds 1.
