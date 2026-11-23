// Hooks for the whole page, loaded by main.ts in their own chunk so startup JS
// stays inside its budget. Each covers every element, now and later, with
// nothing to add per element.
import { installNumberWheel } from './number-wheel'
import { installTitleTips } from './title-tip'

installNumberWheel()
installTitleTips()
