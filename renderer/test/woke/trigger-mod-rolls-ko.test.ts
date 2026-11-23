// The searched number of a first-number stat is its percentage, which ko and
// cmn-Hant write after the Life/Mana amount or the seconds.
import { describe, it, expect, beforeAll } from 'vitest'
import * as Data from '@/assets/data'
import { tryParseTranslation } from '@/parser/stat-translations'
import { ModifierType } from '@/parser/modifiers'

function roll (string: string) {
  return tryParseTranslation({ string, unscalable: false }, ModifierType.Explicit, undefined)?.roll
}

describe('first-number stats in a Korean client', () => {
  beforeAll(() => Data.init('ko'))

  it('searches Foulborn Kitava\'s Thirst by its 50% chance, not the 200 Life', () => {
    const r = roll('스킬 사용 또는 발동을 위해 초기 비용으로 생명력 200 이상 소모 시\n50% 확률로 장착된 주문 발동, 재사용 대기시간 0.1초')
    expect(r).toMatchObject({ value: 50, pair: [200, 50] })
  })

  it('searches Deerstalker by its 15%, not the 9 seconds', () => {
    expect(roll('덫 투척 시 9초 동안 이동 속도 15% 증가')?.value).toBe(15)
  })
})

describe('first-number stats in a Traditional Chinese client', () => {
  beforeAll(() => Data.init('cmn-Hant'))

  it('searches Kitava\'s Thirst by its chance', () => {
    expect(roll('你在前期消耗使用或觸發技能至少 100 魔力時，有 50% 機率觸發插槽中的法術，有 0.1 秒冷卻')?.value).toBe(50)
  })
})
