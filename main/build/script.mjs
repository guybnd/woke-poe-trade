// @ts-check
import child_process from 'child_process'
import electron from 'electron'
import esbuild from 'esbuild'

const isDev = !process.argv.includes('--prod')

const electronRunner = (() => {
  /** @type {child_process.ChildProcess | null} */
  let handle = null
  return {
    restart () {
      console.info('Restarting Electron process.')

      if (handle) handle.kill()
      // woke: extra Electron flags from scripts/woke-dev.ps1 (the debug port).
      const args = [...(process.env.WOKE_ELECTRON_ARGS ?? '').split(' ').filter(Boolean), '.']
      if (process.platform === 'linux') {
        args.unshift('--ozone-platform', 'x11')
      }
      handle = child_process.spawn(String(electron), args, {
        stdio: 'inherit'
      })
    }
  }
})()

const visionBuild = await esbuild.build({
  entryPoints: ['src/vision/link-worker.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/vision.js'
})

const mainContext = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  minify: !isDev,
  platform: 'node',
  external: ['electron', 'uiohook-napi', 'electron-overlay-window'],
  outfile: 'dist/main.js',
  define: {
    'process.env.VITE_DEV_SERVER_URL': (isDev) ? '"http://localhost:5173"' : 'null'
  },
  plugins: (isDev) ? [{
    name: 'electron-runner',
    setup (build) {
      build.onEnd((result) => {
        if (!result.errors.length) electronRunner.restart()
      })
    }
  }] : []
})

if (isDev) {
  await mainContext.watch()
} else {
  await mainContext.rebuild()
  mainContext.dispose()
}
