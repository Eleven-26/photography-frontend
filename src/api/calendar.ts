import { rpc } from './common/http'
import type { CalendarSlot, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

export interface CalendarListParams {
  date?: string
  page?: number
  page_size?: number
}

export function listCalendar(params: CalendarListParams = {}) {
  return rpc<PageResult<CalendarSlot>>(API_PATHS.calendar.list, params)
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
