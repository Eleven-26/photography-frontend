import { rpc } from './common/http'
import type { CalendarSlot } from '@/types'
import { API_PATHS } from './common/apiPath'

export interface CalendarListParams {
  start_date?: string // 起始日期 YYYY-MM-DD
  end_date?: string // 结束日期 YYYY-MM-DD
  photographer_id?: number // 摄影师筛选（可选）
}

/**
 * 档期列表：后端 `calendar/list` 返回**数组**（非分页），
 * 筛选参数 start_date / end_date / photographer_id 走 POST body。
 */
export function listCalendar(params: CalendarListParams = {}) {
  return rpc<CalendarSlot[]>(API_PATHS.calendar.list, params as Record<string, unknown>)
}

export function lockCalendar(data: {
  date: string
  time_range: string // 时段，如 09:00-12:00（对齐后端 CalendarBlockReq）
  order_id?: number
  remark?: string
}) {
  return rpc<CalendarSlot>(API_PATHS.calendar.lock, data)
}

export function cancelCalendar(id: number) {
  return rpc<null>(API_PATHS.calendar.cancel, {}, id)
}
