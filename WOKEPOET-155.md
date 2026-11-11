---
id: WOKEPOET-155
title: 'F. Flips for 3.30: retire scarabs, add Threads, fix Delirium'
status: Grooming
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Agent
parentId: WOKEPOET-149
history:
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:51.527Z'
    comment: Created ticket.
    id: a-2026-11-08t09-53-51-527z
  - type: activity
    user: Agent
    date: '2026-11-08T09:53:51.527Z'
    comment: Created as subtask of WOKEPOET-149.
    id: a-2026-11-08t09-53-51-527z
  - type: activity
    user: Agent
    date: '2026-11-11T04:22:22.635Z'
    comment: Updated title. Updated description.
    id: a-2026-11-11t04-22-22-635z
  - type: comment
    user: Agent
    comment: >-
      **Should Flips get a Threads tab, pricing Frayed Thread to a random Thread
      (and Cryptic Astrolabe to a random Astrolabe)?** It would go in once
      poe.ninja prices Threads, a few days into the league. My default is yes.
    date: '2026-11-11T04:23:01.384Z'
    id: c-2026-11-11t04-23-01-384z
  - type: swimlane_change
    swimlane: require-input
    action: set
    user: Agent
    date: '2026-11-11T04:23:01.384Z'
    comment: >-
      **Should Flips get a Threads tab, pricing Frayed Thread to a random Thread
      (and Cryptic Astrolabe to a random Astrolabe)?** It would go in once
      poe.ninja prices Threads, a few days into the league. My default is yes.
  - type: comment
    user: Agent
    comment: >-
      Guy, 2026-11-11: "Yes we will need thread flips but remain to be seen if
      they can be rerolled at all". On launch day, check what a Thread can be
      turned into: a 3-for-1 vendor, a Harvest reroll, or only Frayed Thread to
      a random Thread. Then build the tab for what exists.
    date: '2026-11-11T05:04:24.640Z'
    id: c-2026-11-11t05-04-24-640z
  - type: swimlane_change
    swimlane: require-input
    action: cleared
    user: Agent
    date: '2026-11-11T05:04:24.640Z'
    comment: >-
      Guy, 2026-11-11: "Yes we will need thread flips but remain to be seen if
      they can be rerolled at all". On launch day, check what a Thread can be
      turned into: a 3-for-1 vendor, a Harvest reroll, or only Frayed Thread to
      a random Thread. Then build the tab for what exists.
swimlane: null
needsAction: null
---
> TL;DR: the Scarabs tab already hides itself (#266). The other 3.30 changes Flips needs are below. The Threads tab waits on Guy's yes.

From the 3.30 patch notes:
- **Frayed Thread** "can be used to grant a random Thread, or vendored for a random Thread". That makes a new reroll flip, Frayed to random Thread, once poe.ninja prices Threads.
- **Cryptic Astrolabe**: can be "used or vendored to grant a random other Astrolabe". It's a possible flip too.
- **Delirium Orbs** now reforge rare maps instead of enchanting them. Fragmented is removed and Skittering is renamed Threaded. Recheck the Delirium family's weights and names.
- **Scarab stash outlines** (`main/src/woke/stash-scarab-data.ts`): the Fragment tab now has a Threads section, and the Scarabs section hides when empty. Retire the scarab layout, or remap it to Threads once a real stash screenshot exists.
- **Vendor recipes**: the 3-maps-for-a-higher-tier recipe is removed. Check whether any flip or guide uses it.
