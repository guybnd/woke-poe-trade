# Checks and tests: don't stutter the game

Guy plays Path of Exile on the same PC while threads work. Heavy local checks make the game stutter, so:

- **Run checks with `scripts\woke-check.cmd`, not npm/npx directly.** With PoE open it pushes the branch and waits for the Tests workflow on GitHub; with PoE closed it runs locally at below-normal priority, testing only what the branch reaches. See "Checks while playing" in DEVELOPING.md.
- While PoE is open (any `PathOfExile*` process), don't run full suites, type checks, `vite build`, Playwright or packaging locally. Leave them to CI.
- One targeted test while iterating is fine: `npx vitest run <file>` from `renderer/` or `testing/`. Local runs are capped at 4 workers (Playwright at 2); `WOKE_TEST_WORKERS` changes that, but don't raise it while PoE is open.
- Stop what you start. Before you end, kill the dev servers, watchers and `tail -F`/`grep` monitors you launched. They outlive the thread and keep using CPU.
