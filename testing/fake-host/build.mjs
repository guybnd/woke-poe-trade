// Builds the fake app (dist/fake-app.cjs) and the vision worker it starts
// (dist/vision.js) from main's sources, with Electron, uiohook's native
// binding and the overlay window swapped for the fake game. Then copies the
// renderer's build next to them, where main's server serves it from.
//
// Run after `npm run build` (or `npx vite build`) in renderer/.
import esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'dist')
const stub = (name) => path.join(here, 'stubs', name)

// Main resolves its packages from main/node_modules; the stubs and pngjs
// from testing/node_modules.
const nodePaths = [path.join(here, '../../main/node_modules'), path.join(here, '../node_modules')]

const stubs = {
  name: 'woke-fake-stubs',
  setup (build) {
    build.onResolve({ filter: /^electron$/ }, () => ({ path: stub('electron.ts') }))
    build.onResolve({ filter: /^electron-overlay-window$/ }, () => ({ path: stub('electron-overlay-window.ts') }))
    build.onResolve({ filter: /^node-gyp-build$/ }, () => ({ path: stub('node-gyp-build.cjs') }))
  }
}

fs.mkdirSync(out, { recursive: true })
// testing/ is an ES module package; the bundles (and the worker main starts
// from vision.js) are CommonJS, as in the app.
fs.writeFileSync(path.join(out, 'package.json'), '{ "type": "commonjs" }\n')

await esbuild.build({
  entryPoints: [path.join(here, 'app.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: path.join(out, 'fake-app.cjs'),
  nodePaths,
  plugins: [stubs],
  // Behave as on Windows, the only platform the toolkit targets (scanning,
  // hotkeys and paths check for it).
  banner: { js: "Object.defineProperty(process, 'platform', { value: 'win32' });" },
  sourcemap: 'inline',
  logLevel: 'warning'
})

// The vision worker checks it runs on Windows (screenshots are BGRA there).
// The fake game's screenshots are BGRA too, so let it run anywhere.
await esbuild.build({
  entryPoints: [path.join(here, '../../main/src/vision/link-worker.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: path.join(out, 'vision.js'),
  nodePaths,
  banner: { js: "Object.defineProperty(process, 'platform', { value: 'win32' });" },
  logLevel: 'warning'
})

// The picture reader's worker (pasted screenshots of a tree).
await esbuild.build({
  entryPoints: [path.join(here, '../../main/src/woke/picture-worker.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: path.join(out, 'picture.js'),
  nodePaths,
  logLevel: 'warning'
})

// The same vision code, as a library for the OCR tests (testing/vision).
await esbuild.build({
  entryPoints: [path.join(here, 'vision-lib.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: path.join(out, 'vision-lib.cjs'),
  nodePaths,
  banner: { js: "Object.defineProperty(process, 'platform', { value: 'win32' });" },
  logLevel: 'warning'
})

const rendererDist = path.join(here, '../../renderer/dist')
if (fs.existsSync(path.join(rendererDist, 'index.html'))) {
  fs.cpSync(rendererDist, out, { recursive: true })
} else {
  console.warn('renderer/dist is missing: run `npx vite build` in renderer/ before end-to-end tests.')
}
console.log('Fake app built:', path.relative(process.cwd(), out))
