// The Per hour setting as it is now (rate-time.ts), from the app config.
import { AppConfig } from '@/web/Config'
import { rateTimeOf } from './rate-time'
import type { RateTime, RateTimeHolder } from './rate-time'

export function rateTime (): RateTime {
  return rateTimeOf(AppConfig() as unknown as RateTimeHolder)
}
