import { rpc } from './common/http'
import type { OperationLog, PageResult, PaymentMethod, StudioSetting, Workspace } from '@/types'
import { API_PATHS } from './common/apiPath'

export interface OperationLogParams {
  keyword?: string
  module?: string
  status?: number | '' // 1-成功 0-失败；'' 表示全部
  page?: number
  page_size?: number
}

/** 操作日志列表（设置页 · 安全与审计）：筛选/分页参数走 POST body */
export function listOperationLogs(params: OperationLogParams = {}) {
  return rpc<PageResult<OperationLog>>(API_PATHS.settings.operationLogList, params as Record<string, unknown>)
}

// ── 工作空间（公司基础信息）────────────────────────

/** 工作空间聚合：公司信息 + 门店 + 角色 + 收款方式 */
export function workspace() {
  return rpc<Workspace>(API_PATHS.settings.workspace)
}

export interface CompanyUpdateParams {
  name: string
  logo?: string
  /** 所在城市 */
  city?: string
  /** 工作室简介 */
  intro?: string
  contact_name?: string
  contact_phone?: string
  address?: string
}

export function updateCompany(data: CompanyUpdateParams) {
  return rpc<null>(API_PATHS.settings.companyUpdate, data)
}

// ── 工作室设置（预约主页 / 接单规则 / 改期政策）─────

/** 读取工作室设置（后端不存在时自动建默认行） */
export function studioGet() {
  return rpc<StudioSetting>(API_PATHS.settings.studioGet)
}

/**
 * 更新工作室设置。后端按「指针非 nil 才更新」语义（见 dto.StaffStudioSettingReq.ToUpdates），
 * 因此**只需传要改的字段**；传入的数值可以为 0。
 */
export interface StudioUpdateParams {
  slogan?: string
  intro?: string
  homepage_slug?: string
  accept_new?: number
  lock_minutes?: number
  reschedule_free_hours?: number
  reschedule_fee_rate?: number
  reschedule_min_hours?: number
  select_deadline_hours?: number
  retain_days?: number
}

export function studioUpdate(data: StudioUpdateParams) {
  return rpc<null>(API_PATHS.settings.studioUpdate, data)
}

// ── 收款方式 ───────────────────────────────────────

export function listPaymentMethods() {
  return rpc<PaymentMethod[]>(API_PATHS.settings.paymentMethodList)
}

export interface PaymentMethodParams {
  name: string
  /** wechat-微信 alipay-支付宝 bank-银行转账 cash-现金 other-其他 */
  type: string
  account_name?: string
  account_no?: string
  qrcode?: string
  /** 1-启用 0-停用 */
  status?: number
  sort?: number
}

export function createPaymentMethod(data: PaymentMethodParams) {
  return rpc<null>(API_PATHS.settings.paymentMethodCreate, data)
}

export function updatePaymentMethod(id: number, data: PaymentMethodParams) {
  return rpc<null>(API_PATHS.settings.paymentMethodUpdate, data, id)
}

export function deletePaymentMethod(id: number) {
  return rpc<null>(API_PATHS.settings.paymentMethodDelete, {}, id)
}
