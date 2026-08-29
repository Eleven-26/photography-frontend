import { rpc } from './common/http'
import type { CalendarSlot, PageResult } from '@/types'

export interface CalendarListParams {
  date?: string
  page?: number
  page_size?: number
}

export function listCalendar(params: CalendarListParams = {}) {
  return rpc<PageResult<CalendarSlot>>('calendar', 'list', params)
}

export function lockCalendar(data: {
  date: string
  start_time: string
  end_time: string
  order_id?: number
  remark?: string
}) {
  return rpc<CalendarSlot>('calendar', 'lock', data)
}

export function cancelCalendar(id: number) {
  return rpc<null>('calendar', 'cancel', {}, id)
}