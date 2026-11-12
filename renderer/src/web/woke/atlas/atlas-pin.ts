// Pinning a strategy's atlas tree over the game (pick P1).
import type { Pin } from '../pins/pins'
import type { AtlasStrategy, AtlasWidget } from './strategies'

export function atlasTreePin (w: AtlasWidget, s: AtlasStrategy): Omit<Pin, 'opacity' | 'spots'> {
  return {
    id: `atlas-tree:${w.wmId}:${s.id}`,
    kind: 'atlas-tree',
    title: `${s.name || 'Untitled'} · atlas`,
    icon: 'fas fa-project-diagram',
    data: { widget: String(w.wmId), strategy: String(s.id) }
  }
}
