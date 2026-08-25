// 通用格式化工具

export const money = (n?: number | null, withSymbol = true) => {
  const v = Number(n || 0)
  const s = v.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
  return withSymbol ? `¥${s}` : s
}

export const moneyShort = (n?: number | null) => {
  const v = Number(n || 0)
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function formatTime(value?: string) {
  if (!value) return ''
  return value.length >= 16 ? value.slice(11, 16) : value
}

export function relativeTime(value?: string | null) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} 小时前`
  return formatDate(value)
}

export const initials = (name?: string | null) => (name || '?').slice(0, 1)

export function percent(n?: number | null, digits = 1) {
  return `${Number(n || 0).toFixed(digits)}%`
}

import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  LEAD_STATUS_LABEL,
  REFUND_STATUS_LABEL,
  DELIVERY_STAGE_LABEL,
  CUSTOMER_LEVEL_LABEL
} from '@/types'

/** 订单状态 -> 状态色 */
export function orderTone(status?: string): string {
  switch (status) {
    case 'pending_deposit': return 'orange'
    case 'scheduled': return 'lav'
    case 'shooting': return 'orange'
    case 'retouching': return 'lav'
    case 'awaiting_delivery': return 'orange'
    case 'completed': return 'mint'
    case 'cancelled': return 'red'
    default: return 'gray'
  }
}

/** 通用状态色（兼容旧调用） */
export function toneOf(key?: string): string {
  const k = String(key || '')
  if (['scheduled', 'awaiting_delivery', 'attention', 'pending'].includes(k)) return 'orange'
  if (['completed', 'confirmed'].includes(k)) return 'mint'
  if (['retouching', 'shooting', 'approved', 'pending_verify'].includes(k)) return 'lav'
  if (['cancelled', 'rejected', 'urgent', 'lose'].includes(k)) return 'red'
  if (['pending_deposit', 'normal', 'active'].includes(k)) return 'gray'
  return 'gray'
}

export { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, LEAD_STATUS_LABEL, REFUND_STATUS_LABEL, DELIVERY_STAGE_LABEL, CUSTOMER_LEVEL_LABEL }