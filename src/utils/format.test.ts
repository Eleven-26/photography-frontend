import { describe, expect, it } from 'vitest'
import { formatDate, formatTime, initials, money, moneyShort, pad2, percent } from './format'

describe('money', () => {
  it('带符号与千分位', () => {
    expect(money(2116)).toBe('¥2,116')
    expect(money(2116.5)).toBe('¥2,116.5')
  })

  it('空值归零', () => {
    expect(money(null)).toBe('¥0')
    expect(money(undefined, false)).toBe('0')
  })
})

describe('moneyShort', () => {
  it('万/千缩写', () => {
    expect(moneyShort(12000)).toBe('1.2万')
    expect(moneyShort(1500)).toBe('1.5k')
    expect(moneyShort(900)).toBe('900')
  })
})

describe('pad2 / 日期 / 时间', () => {
  it('pad2 补零', () => expect(pad2(3)).toBe('03'))
  it('formatDate 本地日期', () => expect(formatDate('2026-09-21 13:00:00')).toBe('2026-09-21'))
  it('formatDate 空值占位', () => expect(formatDate('')).toBe('—'))
  it('formatTime 取 HH:mm', () => expect(formatTime('2026-09-21 13:45:00')).toBe('13:45'))
})

describe('initials / percent', () => {
  it('initials 取首字', () => expect(initials('张三')).toBe('张'))
  it('percent 默认一位小数', () => expect(percent(12.345)).toBe('12.3%'))
})
