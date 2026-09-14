import { rpc } from './common/http'
import type { Lead, LeadBriefItem, LeadMessage, PageResult, Quote, Customer } from '@/types'
import { API_PATHS } from './common/apiPath'

export interface LeadListParams {
  status?: number | '' // 线索状态 int 枚举 1-5，见 LEAD_STATUS；'' 表示全部
  keyword?: string
  owner_id?: number
  page?: number
  page_size?: number
}

/** 线索列表：筛选/分页参数走 POST body */
export function listLeads(params: LeadListParams = {}) {
  return rpc<PageResult<Lead>>(API_PATHS.lead.list, params as Record<string, unknown>)
}

export function leadDetail(id: number) {
  return rpc<Lead>(API_PATHS.lead.detail, {}, id)
}

export function createLead(data: Partial<Lead>) {
  return rpc<Lead>(API_PATHS.lead.create, data)
}

export function updateLead(id: number, data: Partial<Lead>) {
  return rpc<null>(API_PATHS.lead.update, { ...data, id })
}

/** 记录一次跟进（累加跟进次数、刷新最近跟进时间） */
export function followLead(id: number, data?: { remark?: string }) {
  return rpc<null>(API_PATHS.lead.follow, data, id)
}

/** 线索转客户：后端创建客户并把线索置为「已成交」，返回新建客户 */
export function convertLead(id: number) {
  return rpc<Customer>(API_PATHS.lead.convert, {}, id)
}

// ── 沟通记录 ──────────────────────────────────────
export function listLeadMessages(leadId: number) {
  return rpc<LeadMessage[]>(API_PATHS.lead.messages, {}, leadId)
}

export function sendLeadMessage(
  leadId: number,
  data: { content: string; channel?: string; msg_type?: number; biz_id?: number }
) {
  return rpc<LeadMessage>(API_PATHS.lead.messageSend, data, leadId)
}

// ── 需求摘要（AI Brief）───────────────────────────
export function listLeadBrief(leadId: number) {
  return rpc<LeadBriefItem[]>(API_PATHS.lead.briefList, {}, leadId)
}

/** 重建需求摘要（覆盖旧数据），返回新的简报项 */
export function generateLeadBrief(leadId: number) {
  return rpc<LeadBriefItem[]>(API_PATHS.lead.briefGenerate, {}, leadId)
}

// ── 报价单 ────────────────────────────────────────
export interface QuoteCreateParams {
  package_id: number
  title?: string
  addon_price?: number
  shoot_date?: string
  remark?: string
}

export function listQuotes(leadId: number) {
  return rpc<Quote[]>(API_PATHS.quote.list, {}, leadId)
}

export function createQuote(leadId: number, data: QuoteCreateParams) {
  return rpc<Quote>(API_PATHS.quote.create, { ...data, lead_id: leadId })
}

/** 变更报价单状态 1-草稿 2-已发送 3-已接受 4-已拒绝 5-已成交 */
export function setQuoteStatus(id: number, status: number) {
  return rpc<null>(API_PATHS.quote.status, { status }, id)
}
