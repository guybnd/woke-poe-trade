Copies of NeverSink's filter (MIT, see LICENSE.txt) from
https://github.com/NeverSinkDev/NeverSink-Filter, version 8.20.2, gzipped.
Tests read them through `renderer/test/helpers/neversink.ts`.

To test every style or a newer version without committing it, point
`WOKE_NEVERSINK_DIR` at a checkout of that repository and run
`npx vitest run test/woke/filter-parse` in `renderer/`.
