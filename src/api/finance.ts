import { rpc } from './common/http'
import type { FinanceSummary, Payment, Refund, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

export function financeSummary() {
  return rpc<FinanceSummary>(API_PATHS.finance.summary)
}

export function listPayments(params: { status?: number | '' } = {}) {
  // status 为支付状态 int 枚举 1-4（见 PAYMENT_STATUS），'' 表示全部
  return rpc<PageResult<Payment>>(API_PATHS.finance.payments, params)
}

export function listRefunds(params: { status?: number | '' } = {}) {
  // status 为退款状态 int 枚举 1-4（见 REFUND_STATUS），'' 表示全部
  return rpc<PageResult<Refund>>(API_PATHS.finance.refunds, params)
}

export function confirmPayment(id: number, data?: { remark?: string }) {
  return rpc<null>(API_PATHS.payment.confirm, data, id)
}

export function auditRefund(id: number, data: { approved: boolean; remark?: string }) {
  return rpc<null>(API_PATHS.refund.audit, data, id)
}
