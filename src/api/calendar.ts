import { rpc } from './common/http'
import type { CalendarSlot, SlotTemplate } from '@/types'
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

// ── 档期规则（排班时段模板）──────────────────────────

export interface SlotTemplateParams {
  /** 摄影师ID，0=全店通用 */
  photographer_id?: number
  /** 星期几 0-周日 ... 6-周六 */
  weekday: number
  start_time: string
  end_time: string
  /** 1-启用 0-停用 */
  status?: number
}

/** 档期时段模板列表 */
export function listSlotTemplates(photographerId = 0) {
  return rpc<SlotTemplate[]>(API_PATHS.calendar.slotTemplateList, { photographer_id: photographerId })
}

/** 新建（不传 id）/ 更新（传 id）档期时段模板 */
export function saveSlotTemplate(data: SlotTemplateParams, id?: number) {
  return rpc<SlotTemplate>(API_PATHS.calendar.slotTemplateSave, data, id)
}

export function deleteSlotTemplate(id: number) {
  return rpc<null>(API_PATHS.calendar.slotTemplateDelete, {}, id)
}
