---
id: WOKEPOET-87
title: 'Lab: right layout for the difficulty, and a way past poelab''s 403'
status: Grooming
priority: High
effort: None
assignee: unassigned
tags:
  - bug
  - ui
createdBy: Agent
updatedBy: Agent
history:
  - type: activity
    user: Agent
    date: '2026-11-05T10:54:25.660Z'
    comment: Created ticket.
    id: a-2026-11-05t10-54-25-660z
  - type: comment
    user: Agent
    comment: >-
      Difficulty fixed in PR #171. Still open here: poelab's 403 and bot check,
      untested inside the app, and a difficulty pick in the plaza (mock first).
    date: '2026-11-05T12:02:38.262Z'
    selfAttested: true
    id: c-2026-11-05t12-02-38-262z
  - type: comment
    user: Agent
    comment: >-
      Guy's pick C merged as #365 (61a9f8ac): the plaza guesses the lab you ran
      last, and its card has the four lab buttons. Still open: poelab's 403 and
      bot check, which can only be tested inside the real app.
    date: '2026-11-12T07:17:06.484Z'
    selfAttested: true
    id: c-2026-11-12t07-17-06-484z
---
Step 5 of the [gameplay helpers critique](https://claude.ai/artifact/NjdEZhrQZBmKwRB56yTsoj). Mock first.

- Every plaza is `Labyrinth_Airlock` at level 33, so auto-load always picks Normal. Read the difficulty from the first room's id (`1_`, `2_`, `3_`, `EndGame_`), and offer a quick difficulty pick in the plaza.
- poelab answered 403 to a direct request and showed a bot check in a browser. Test from inside the app, then find a route that doesn't try to defeat the check.
