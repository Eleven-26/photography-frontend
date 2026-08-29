import { rpc } from './common/http'
import type { Lead, PageResult } from '@/types'

export interface LeadListParams {
  status?: string
  keyword?: string
  page?: number
  page_size?: number
}

export function listLeads(params: LeadListParams = {}) {
  return rpc<PageResult<Lead>>('lead', 'list', params)
}

export function leadDetail(id: number) {
  return rpc<Lead>('lead', 'detail', {}, id)
}

export function createLead(data: Partial<Lead>) {
  return rpc<Lead>('lead', 'create', data)
}

export function updateLead(id: number, data: Partial<Lead>) {
  return rpc<Lead>('lead', 'update', data, id)
}

export function followLead(id: number, data?: { remark?: string }) {
  return rpc<null>('lead', 'follow', data, id)
}

export function convertLead(id: number) {
  return rpc<null>('lead', 'convert', {}, id)
}