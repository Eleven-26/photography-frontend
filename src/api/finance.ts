import { rpc } from './http'
import type { FinanceSummary, Payment, Refund, PageResult } from '@/types'

export function financeSummary() {
  return rpc<FinanceSummary>('finance', 'summary')
}

export function listPayments(params: Record<string, unknown> = {}) {
  return rpc<PageResult<Payment>>('finance', 'payments', params)
}

export function listRefunds(params: Record<string, unknown> = {}) {
  return rpc<PageResult<Refund>>('finance', 'refunds', params)
}

export function confirmPayment(id: number, data?: { remark?: string }) {
  return rpc<null>('payment', 'confirm', data, id)
}

export function auditRefund(id: number, data: { approved: boolean; remark?: string }) {
  return rpc<null>('refund', 'audit', data, id)
}