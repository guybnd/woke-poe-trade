import { describe, expect, it } from 'vitest'
import { clickWhilePlaying } from '@/web/woke/dock/click'
import { noticeAction } from '@/web/woke/loot-filter/notices'

describe('clicking a dock icon while playing', () => {
  const run = () => {}

  it('opens the full window when the icon has one', () => {
    expect(clickWhilePlaying({ wmId: 3 }, undefined)).toBe('window')
    expect(clickWhilePlaying({ wmId: 0 }, true)).toBe('window')
  })

  it('opens the card when there is no window', () => {
    expect(clickWhilePlaying({}, undefined)).toBe('card')
  })

  it('keeps an icon\'s own click action', () => {
    expect(clickWhilePlaying({ wmId: 3, gameClick: run }, undefined)).toBe('game')
  })

  it('opens the card first with hover cards off, the only way to reach it', () => {
    expect(clickWhilePlaying({ wmId: 3 }, false)).toBe('card')
    expect(clickWhilePlaying({ wmId: 3, gameClick: run }, false)).toBe('card')
  })
})

describe('the loot filter card button', () => {
  const notice = (id: string, value: string | number = 1) => ({ id, value, text: '' })

  it('counts the price moves', () => {
    expect(noticeAction(notice('prices', 42))).toBe('Review 42 moves')
    expect(noticeAction(notice('prices', 1))).toBe('Review 1 move')
  })

  it('says where each notice goes', () => {
    expect(noticeAction(notice('update'))).toBe('Review update')
    expect(noticeAction(notice('safety'))).toBe('See safety net')
    expect(noticeAction(notice('failed'))).toBe('Fix changes')
    expect(noticeAction(notice('wrong'))).toBe('Open editor')
  })
})
