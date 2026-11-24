// An elevated copy waits for the process that started it to quit first
// (run-as-admin.ts, wait-starter.ts). One run only: relaunchArgs drops it.
export const AFTER_PID_ARG = '--woke-after-pid='
