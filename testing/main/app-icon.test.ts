// main/src/woke/app-icon.ts: an id from the config file must only ever name a
// bundled icon.
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { resolveAppIcon } from '../../main/src/woke/app-icon'

const DIR = path.join(__dirname, '../../renderer/public/images/app-icons')

describe('resolveAppIcon', () => {
  it('keeps a bundled icon', () => {
    expect(resolveAppIcon('goldrim', DIR)).toBe('goldrim')
  })

  it.each([
    [undefined], [null], [7], [''], ['nope'], ['../../../package'], ['..\\evil'], ['Goldrim'], ['goldrim.png']
  ])('falls back to the default for %j', (id) => {
    expect(resolveAppIcon(id, DIR)).toBe('eternal-orb')
  })
})
