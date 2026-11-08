// Entry point for the real-Electron smoke test (see smoke.mjs). Starts the app
// exactly as the installer does (require main.js), waits for the overlay page,
// checks it and <webview>, then reports to WOKE_SMOKE_RESULT and quits.
require('./main.js')
const { app, BrowserWindow } = require('electron')
const fs = require('fs')

const out = process.env.WOKE_SMOKE_RESULT
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function overlayWindow () {
  for (let i = 0; i < 120; i++) {
    const win = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('/index.html'))
    if (win && !win.webContents.isLoading()) return win
    await wait(250)
  }
  return null
}

// Same tag the price check, trade searches and lab use, loading a file from the
// app's own server (no network in CI; webviews only load web pages, so not a
// data: URL).
const WEBVIEW_CHECK = `new Promise((resolve) => {
  const wv = document.createElement('webview')
  wv.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:100px'
  const done = (ok, err) => { wv.remove(); resolve({ ok, err }) }
  wv.addEventListener('did-finish-load', () => done(true))
  wv.addEventListener('did-fail-load', (e) => done(false, e.errorDescription))
  setTimeout(() => done(false, 'timed out'), 15000)
  wv.src = location.origin + '/icon.png'
  document.body.appendChild(wv)
})`

app.whenReady().then(async () => {
  const result = { overlayLoaded: false, appMounted: false, webviewWorks: false }
  try {
    const win = await overlayWindow()
    result.overlayUrl = win?.webContents.getURL() ?? null
    result.overlayLoaded = !!win
    if (win) {
      // let the app mount its widgets and go idle
      for (let i = 0; i < 40 && !result.appMounted; i++) {
        result.appMounted = await win.webContents.executeJavaScript(
          "(document.querySelector('#app')?.childElementCount ?? 0) > 0")
        if (!result.appMounted) await wait(250)
      }
      // settle, then let smoke.mjs sample memory before the webview check
      await wait(8000)
      if (out) {
        fs.writeFileSync(out + '.settled', '')
        for (let i = 0; i < 40 && !fs.existsSync(out + '.measured'); i++) await wait(250)
      }
      const wv = await win.webContents.executeJavaScript(WEBVIEW_CHECK)
      result.webviewWorks = wv.ok
      if (!wv.ok) result.webviewError = wv.err
    }
    result.mainHeapMB = Math.round(process.memoryUsage().heapUsed / 1048576)
    result.metrics = app.getAppMetrics().map(m => ({
      type: m.type, name: m.serviceName || m.name || '', workingSetMB: Math.round(m.memory.workingSetSize / 1024)
    }))
  } catch (e) {
    result.error = String(e && e.stack || e)
  }
  if (out) fs.writeFileSync(out, JSON.stringify(result))
  app.exit(0)
})
