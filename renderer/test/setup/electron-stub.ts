// Main-process code under test only needs a home folder from Electron.
import { tmpdir } from 'os'

export const app = { getPath: () => tmpdir() }
