// Bundled exile-leveling route (MIT, see route/README.md).
import routeJson from './route/data.json'
import { parseRoute } from './route-parse'
import type { Route, RouteData, RouteOptions } from './route-parse'

const files = import.meta.glob<string>('./route/act-*.txt', { query: '?raw', import: 'default', eager: true })

// The route files' text, act 1 first.
export const routeSources = Object.entries(files)
  .map(([path, text]) => ({ act: Number(/act-(\d+)\.txt$/.exec(path)?.[1] ?? 0), text }))
  .sort((a, b) => a.act - b.act)
  .map(f => f.text)

export const routeData = routeJson as RouteData

const cache = new Map<string, Route>()

export function bundledRoute (opts: RouteOptions): Route {
  const key = `${opts.leagueStart}|${opts.library}|${opts.bandit}`
  let route = cache.get(key)
  if (!route) {
    route = parseRoute(routeSources, routeData, opts)
    cache.set(key, route)
  }
  return route
}

export function areaName (areaId: string): string {
  return routeData.areas[areaId]?.[0] ?? areaId
}
