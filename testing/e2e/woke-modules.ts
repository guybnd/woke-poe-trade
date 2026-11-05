// The toolkit's module list, for tests. By require, not import: on Node 20 an
// import of a TypeScript file in renderer/ (no "type": "module") stops every test
// from loading. Node 22 is fine either way.
import { createRequire } from 'module'

export const { MODULES } = createRequire(import.meta.url)('../../renderer/src/web/woke/modules.ts') as typeof import('../../renderer/src/web/woke/modules')
