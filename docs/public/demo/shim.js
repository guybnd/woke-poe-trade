// The browser demo's stand-in for the desktop app. Loaded before the overlay
// (the real renderer build) inside the demo page's frame, it answers what the
// overlay would ask the app over its socket and HTTP:
//
// - /config: the layout recorded by testing/e2e/demo-record.spec.ts
// - /proxy/<url>: trade site and poe.ninja answers from testing/fixtures/http
// - the socket: replays what the app sent for each hotkey (recording.json),
//   answers the overlay's requests with what the app answered when recorded,
//   and keeps what the overlay saves in memory for this visit.
//
// The demo page (index.html) drives it with postMessage: { demo: 'action', name }.
(function () {
  'use strict'
  var here = new URL('.', document.currentScript.src).href
  var loaded = Promise.all([
    fetch(here + 'recording.json').then(function (r) { return r.json() }),
    fetch(here + 'http.json').then(function (r) { return r.json() }),
    fetch(here + 'seed.json').then(function (r) { return r.json() }).then(relativeTimes)
  ])

  // seed.json: sample history the overlay asks the app for. Its times are
  // relative (ms before now, as negative numbers), so it never goes stale.
  function relativeTimes (v, k) {
    if (Array.isArray(v)) return v.map(function (x) { return relativeTimes(x) })
    if (v && typeof v === 'object') {
      var out = {}
      for (var key in v) out[key] = relativeTimes(v[key], key)
      return out
    }
    if (typeof v === 'number' && v < 0 && /(At|^at)$/.test(k || '')) return Date.now() + v
    return v
  }

  // The overlay only acts as an overlay in Electron.
  var ua = navigator.userAgent
  Object.defineProperty(Navigator.prototype, 'userAgent', {
    get: function () { return ua + ' awakened-poe-trade/demo Electron/40.0.0' }
  })

  // ---- HTTP ----
  var nativeFetch = window.fetch.bind(window)
  function json (body, status) {
    return new Response(JSON.stringify(body), { status: status || 200, headers: { 'content-type': 'application/json' } })
  }
  // /proxy/<host>/<path> -> fixture, as testing/fake-host/app.ts serves it:
  // <path>[.<method>].json, else _any[.<method>].json in the same folder.
  function fixture (http, url, method) {
    var target = url.split('?')[0]
    var dir = target.split('/').slice(0, -1).join('/')
    var tries = [target + '.' + method + '.json', target + '.json', dir + '/_any.' + method + '.json', dir + '/_any.json']
    for (var i = 0; i < tries.length; i++) {
      if (Object.prototype.hasOwnProperty.call(http, tries[i])) return http[tries[i]]
    }
    return null
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input)
    var method = ((init && init.method) || (input && input.method) || 'GET').toLowerCase()
    if (url === '/config') {
      return loaded.then(function (all) { return json(all[0].config) })
    }
    if (url.indexOf('/proxy/') === 0) {
      return loaded.then(function (all) {
        var body = fixture(all[1], decodeURIComponent(url.slice('/proxy/'.length)), method)
        if (body == null) return json({ error: { message: 'Not part of the demo' } }, 404)
        var headers = { 'content-type': 'application/json' }
        if (url.indexOf('/api/trade/') !== -1) {
          headers['x-rate-limit-rules'] = 'Ip'
          headers['x-rate-limit-ip'] = '100:1:0'
          headers['x-rate-limit-ip-state'] = '1:1:0'
        }
        return new Response(body, { status: 200, headers: headers })
      })
    }
    if (url.indexOf('/uploads/') === 0) {
      return Promise.resolve(json({ error: 'Files can\'t be added in the demo' }, 400))
    }
    return nativeFetch(input, init)
  }

  // ---- the app's socket ----
  var socket = null
  var seed = {}
  var snapshot = null
  var docs = {}
  var zones = {}
  var hovered = {}
  var overlayOpen = false

  function deliver (name, payload) {
    if (!socket || !socket.onmessage) return
    socket.onmessage({ data: JSON.stringify({ name: name, payload: payload }) })
  }
  function setOverlay (open) {
    if (open === overlayOpen) return
    overlayOpen = open
    deliver('MAIN->OVERLAY::focus-change', open
      ? { game: false, overlay: true, usingHotkey: true }
      : { game: true, overlay: false, usingHotkey: false })
    parent.postMessage({ demo: 'overlay', open: open }, '*')
  }

  // What the app answered for a request when recorded: the same arguments,
  // else the same request with any arguments.
  function answer (rec, op, args) {
    if (Object.prototype.hasOwnProperty.call(seed, op)) return { ok: true, data: seed[op] }
    // The latest prices: what the overlay saved here, else poe.ninja's
    // answer in http.json (with the demo's sample prices).
    if (op === 'market-save') { snapshot = args.snapshot; return { ok: true, data: null } }
    if (op === 'market-latest') return { ok: true, data: [snapshot || ninjaSnapshot(args.league)] }
    if (op === 'market-import-status') return { ok: true, data: { imported: true } }
    if (op === 'doc-get') return { ok: true, data: Object.prototype.hasOwnProperty.call(docs, key(args)) ? docs[key(args)] : null }
    if (op === 'doc-put') { docs[key(args)] = args && args.value; return { ok: true, data: null } }
    var exact = rec.requests[op + ' ' + JSON.stringify(args)]
    if (exact) return exact
    for (var k in rec.requests) {
      if (k.split(' ')[0] === op) return rec.requests[k]
    }
    // Saves and other writes: accepted and kept for this visit only.
    if (/-(put|save|save-many|add|delete|set|write|dismiss|finish|stop|start|install)$/.test(op)) return { ok: true, data: null }
    return { ok: false, error: 'Not available in the demo' }
  }
  function ninjaSnapshot (league) {
    var dense = JSON.parse(socket.http['poe.ninja/poe1/api/economy/current/dense/overviews.json'])
    var items = []
    dense.currencyOverviews.concat(dense.itemOverviews).forEach(function (ov) {
      ov.lines.forEach(function (l) { items.push({ type: ov.type, name: l.name, variant: l.variant || '', chaos: l.chaos }) })
    })
    var divine = items.filter(function (i) { return i.name === 'Divine Orb' })[0]
    return { league: league, ts: Date.now(), divine: divine ? divine.chaos : null, items: items }
  }
  function key (args) { return JSON.stringify(args && (args.key || args.name || args.id) || args) }

  function FakeSocket () {
    var self = this
    socket = this
    this.readyState = 0
    loaded.then(function (all) {
      self.readyState = 1
      if (self.onopen) self.onopen({})
      self.rec = all[0]
      self.http = all[1]
      seed = all[2]
      whenMounted(function () { settle(function () { parent.postMessage({ demo: 'ready' }, '*') }) })
    })
  }
  // The overlay can take a few seconds to load its game data and mount.
  function whenMounted (cb) {
    if (document.getElementById('overlay-window')) return cb()
    var watch = new MutationObserver(function () {
      if (!document.getElementById('overlay-window')) return
      watch.disconnect()
      cb()
    })
    watch.observe(document.documentElement, { childList: true, subtree: true })
  }
  // New tools open themselves the first time the overlay opens. Open it once
  // out of sight and close all of them but the market tracker, so a visitor
  // meets a tidy overlay.
  function settle (cb) {
    deliver('MAIN->OVERLAY::focus-change', { game: false, overlay: true, usingHotkey: true })
    // Tools open as they load: close them until none has opened for a while.
    // A tool can open itself again as it finishes loading, so keep at it; but
    // give a click time to land, or a second one would reopen it.
    var clicked = {}
    var quiet = 0
    var tries = 0
    var pass = setInterval(function () {
      var open = 0
      document.querySelectorAll('#overlay-window button[aria-label]').forEach(function (b) {
        var name = b.getAttribute('aria-label')
        if (!/_open_/.test(b.className) || name === 'Market') return
        open++
        if (Date.now() - (clicked[name] || 0) > 700) { clicked[name] = Date.now(); b.click() }
      })
      quiet = open ? 0 : quiet + 1
      if (quiet < 3 && ++tries < 40) return
      clearInterval(pass)
      deliver('MAIN->OVERLAY::focus-change', { game: true, overlay: false, usingHotkey: false })
      cb()
    }, 250)
  }
  FakeSocket.prototype.send = function (data) {
    var ev = JSON.parse(data)
    var rec = this.rec
    var p = ev.payload
    switch (ev.name) {
      case 'CLIENT->MAIN::woke-request': {
        var res = answer(rec, p.op, p.args)
        setTimeout(function () {
          deliver('MAIN->CLIENT::woke-response', { id: p.id, ok: res.ok, data: res.data, error: res.error })
        }, 20)
        break
      }
      case 'OVERLAY->MAIN::focus-game':
        setOverlay(false)
        break
      case 'OVERLAY->MAIN::woke-open-overlay':
        setOverlay(true)
        break
      case 'OVERLAY->MAIN::woke-hover-zones':
        zones[p.owner] = p.zones
        break
    }
  }
  FakeSocket.prototype.close = function () {}
  FakeSocket.OPEN = 1
  window.WebSocket = FakeSocket

  // Hover zones: the app's mouse hook tells a widget when the mouse is over
  // it while the game has focus. Here the frame sees the mouse itself.
  document.addEventListener('mousemove', function (e) {
    if (overlayOpen) return
    for (var owner in zones) {
      zones[owner].forEach(function (z) {
        var inside = e.clientX >= z.x && e.clientX < z.x + z.width && e.clientY >= z.y && e.clientY < z.y + z.height
        if (Boolean(hovered[z.id]) !== inside) {
          hovered[z.id] = inside
          deliver('MAIN->OVERLAY::woke-hover', { id: z.id, inside: inside })
          parent.postMessage({ demo: 'hover', inside: inside }, '*')
        }
      })
    }
  }, true)
  // Leaving the frame leaves every zone (the game would see the mouse go).
  document.addEventListener('mouseout', function (e) {
    if (e.relatedTarget) return
    for (var id in hovered) {
      if (!hovered[id]) continue
      hovered[id] = false
      deliver('MAIN->OVERLAY::woke-hover', { id: id, inside: false })
    }
    parent.postMessage({ demo: 'hover', inside: false }, '*')
  }, true)
  document.addEventListener('mousedown', function () {
    if (overlayOpen) return
    for (var id in hovered) {
      if (hovered[id]) deliver('MAIN->OVERLAY::woke-hover-click', { id: id })
    }
  }, true)

  // Hotkeys pressed inside the frame go to the demo page, which knows what
  // is under the cursor.
  // The physical key, so Alt+S works on a Mac (Option+S types ß) and any layout.
  document.addEventListener('keydown', function (e) {
    var combo = (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.code === 'Space' ? 'Space' : /^Key[A-Z]$/.test(e.code) ? e.code.slice(3) : e.key)
    if (/^(Ctrl\+D|Shift\+Space|Alt\+[ESF])$/.test(combo)) {
      e.preventDefault()
      e.stopPropagation()
      parent.postMessage({ demo: 'key', combo: combo }, '*')
    }
  }, true)

  window.addEventListener('message', function (e) {
    var msg = e.data || {}
    if (e.source !== parent || !socket || !socket.rec) return
    if (msg.demo === 'overlay') setOverlay(msg.open)
    // Where a dock icon is, so the page can point at it.
    if (msg.demo === 'locate') {
      var icon = document.querySelector('[data-dock="' + msg.dock + '"]')
      var r = icon && icon.getBoundingClientRect()
      parent.postMessage({ demo: 'spot', dock: msg.dock, gen: msg.gen, tries: msg.tries, x: r ? r.x + r.width / 2 : null, y: r ? r.y + r.height / 2 : null }, '*')
    }
    if (msg.demo === 'action') {
      var events = socket.rec.actions[msg.name] || []
      if (overlayOpen && /^(price|filter|essence|map)/.test(msg.name) && !/-stop$/.test(msg.name)) setOverlay(false)
      events.forEach(function (r, i) {
        setTimeout(function () { deliver(r.name, r.payload) }, 40 * i)
      })
      // The filter card takes focus (its replay holds the focus change).
      if (msg.name === 'filter-card') {
        overlayOpen = true
        parent.postMessage({ demo: 'overlay', open: true }, '*')
      }
    }
  })
})()
