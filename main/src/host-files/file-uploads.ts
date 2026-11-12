import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import { app } from 'electron'
import type { EventEmitter } from 'events'
import type { IncomingMessage, ServerResponse } from 'http'
import { sendFile } from './request-guard'

export function addFileUploadRoutes (routes: EventEmitter) {
  const uploadsPath = path.join(app.getPath('userData'), 'apt-data', 'files')

  routes.addListener('request', (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET' || !req.url?.startsWith('/uploads/')) return

    // Uploads are served with no content type: the browser mustn't guess one
    // (a dropped .html or .svg could otherwise run as a page).
    res.setHeader('X-Content-Type-Options', 'nosniff')
    sendFile(uploadsPath, req.url.slice('/uploads'.length), res)
  })

  routes.addListener('request', (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST' || !req.url?.startsWith('/uploads/')) return

    let contents = Buffer.alloc(0)
    req.on('data', (chunk) => {
      if (contents.length > 16_000_000) {
        return req.destroy()
      }
      contents = Buffer.concat([contents, chunk])
    })
    req.once('end', () => {
      const hash = crypto.createHash('md5').update(contents).digest('hex')
      const filename = `${hash}${path.extname(req.url!)}`

      fs.mkdirSync(uploadsPath, { recursive: true })
      fs.writeFileSync(path.join(uploadsPath, filename), contents)

      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ name: filename }))
    })
  })
}
