import { rpc } from './common/http'
import type { Lead, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

export interface LeadListParams {
  status?: number | '' // 线索状态 int 枚举 1-5，见 LEAD_STATUS；'' 表示全部
  keyword?: string
  page?: number
  page_size?: number
}

export function listLeads(params: LeadListParams = {}) {
  return rpc<PageResult<Lead>>(API_PATHS.lead.list, params)
}

export function leadDetail(id: number) {
  return rpc<Lead>(API_PATHS.lead.detail, {}, id)
}

export function createLead(data: Partial<Lead>) {
  return rpc<Lead>(API_PATHS.lead.create, data)
}

export function updateLead(id: number, data: Partial<Lead>) {
  return rpc<Lead>(API_PATHS.lead.update, data, id)
}

export function followLead(id: number, data?: { remark?: string }) {
  return rpc<null>(API_PATHS.lead.follow, data, id)
}

export function convertLead(id: number) {
  return rpc<null>(API_PATHS.lead.convert, {}, id)
}
