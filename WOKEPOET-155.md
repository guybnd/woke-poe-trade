---
id: WOKEPOET-155
title: 'F. Flips for 3.30: retire scarabs, add Threads, fix Delirium'
status: Done
priority: Medium
effort: None
assignee: unassigned
tags:
  - feature
createdBy: Agent
updatedBy: Guy
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
  - type: comment
    user: Agent
    comment: >-
      Guy's tool audit (2026-11-21): Flips is marked "improve". The 3.30 rework
      here is the improvement. Card:
      https://claude.ai/artifact/GcCaMCbbGftoqCeMA5CbGD
    date: '2026-11-21T13:14:19.652Z'
    selfAttested: true
    id: c-2026-11-21t13-14-19-652z
  - type: comment
    user: Agent
    comment: >-
      Mockup with Guy's choices (Threads tab, Thread recipe, Astrolabes, Frayed
      Thread): https://claude.ai/artifact/5EcnAvCUWUgW9Mop5mSMoz — building the
      recommended options on woke/flips-330 meanwhile.
    date: '2026-11-21T13:27:24.719Z'
    selfAttested: true
    id: c-2026-11-21t13-27-24-719z
  - type: status_change
    from: Grooming
    to: In Progress
    user: Agent
    date: '2026-11-21T13:27:25.175Z'
  - type: comment
    user: Agent
    comment: >-
      PR 739 merged: Threads tab, no Scarabs, Delirium/Catalyst fixes,
      Ctrl+Space flips, Threads on the mechanics card. Adversarial review done
      and fixed; CI green.
    date: '2026-11-21T13:58:09.118Z'
    completionComment: true
    id: c-2026-11-21t13-58-09-118z
  - type: status_change
    from: In Progress
    to: Ready
    user: Agent
    date: '2026-11-21T13:58:09.118Z'
  - type: comment
    user: Agent
    comment: >-
      Flips for 3.30 (PR 739): Scarabs tab removed; Threads tab (3-for-1 vendor,
      equal weights, low confidence, out of the dock best flip, Frayed Thread
      opener line); Delirium cut to the 11 drop-enabled orbs (Threaded keeps
      Skittering's weight); Sinistral/Dextral catalysts out; Ctrl+Space flip
      cards and "flips"; Thread recipe in, 3-maps recipe out; old Scarab stash
      tab gives a note; League mechanics card finds Threads under poe.ninja's
      Thread type. Open: Guy to confirm the Thread recipe's exact rule (mockup
      https://claude.ai/artifact/5EcnAvCUWUgW9Mop5mSMoz). Not done: main-process
      scarab stash layout retirement (needs a 3.30 Fragment tab screenshot);
      Astrolabes tab left out (400 Primal reroll never pays).
    completionComment: true
    date: '2026-11-21T13:58:23.104Z'
    id: c-2026-11-21t13-58-23-104z
  - type: status_change
    from: Ready
    to: Done
    user: Agent
    date: '2026-11-21T13:58:23.492Z'
  - type: comment
    user: Guy
    comment: >-
      Guy, 2026-11-21: "yes its fine", confirming the Flips 3.30 work and the
      Thread recipe assumption (3 in, 1 of a different type).
    date: '2026-11-21T14:24:13.245Z'
    selfAttested: true
    id: c-2026-11-21t14-24-13-245z
swimlane: null
needsAction: null
reviewState: approved
baselineCommit: a717ec34993c84c76511c3a3c34d120fd5288bb7
implementationLink: 'https://github.com/guybnd/woke-poe-trade/pull/739'
diffSummary:
  - file: renderer/src/web/woke/pob-builds/BuildDetail.vue
    additions: 4
    deletions: 4
  - file: renderer/src/web/woke/pob-builds/build-model.ts
    additions: 14
    deletions: 0
  - file: renderer/test/woke/pob-builds.test.ts
    additions: 39
    deletions: 1
---
> TL;DR: the Scarabs tab already hides itself (#266). The other 3.30 changes Flips needs are below. The Threads tab waits on Guy's yes.

From the 3.30 patch notes:
- **Frayed Thread** "can be used to grant a random Thread, or vendored for a random Thread". That makes a new reroll flip, Frayed to random Thread, once poe.ninja prices Threads.
- **Cryptic Astrolabe**: can be "used or vendored to grant a random other Astrolabe". It's a possible flip too.
- **Delirium Orbs** now reforge rare maps instead of enchanting them. Fragmented is removed and Skittering is renamed Threaded. Recheck the Delirium family's weights and names.
- **Scarab stash outlines** (`main/src/woke/stash-scarab-data.ts`): the Fragment tab now has a Threads section, and the Scarabs section hides when empty. Retire the scarab layout, or remap it to Threads once a real stash screenshot exists.
- **Vendor recipes**: the 3-maps-for-a-higher-tier recipe is removed. Check whether any flip or guide uses it.
