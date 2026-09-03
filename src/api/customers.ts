import { rpc } from './common/http'
import type { Customer, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

export interface CustomerListParams {
  keyword?: string
  status?: number | '' // 客户状态 int 枚举 1-3，见 CUSTOMER_STATUS；'' 表示全部
  level?: number | '' // 客户等级 int 枚举 1-4，见 CUSTOMER_LEVEL；'' 表示全部
  page?: number
  page_size?: number
}

export function listCustomers(params: CustomerListParams = {}) {
  return rpc<PageResult<Customer>>(API_PATHS.customer.list, params)
}

export function customerDetail(id: number) {
  return rpc<Customer>(API_PATHS.customer.detail, {}, id)
}

export function createCustomer(data: Partial<Customer>) {
  return rpc<Customer>(API_PATHS.customer.create, data)
}

export function updateCustomer(id: number, data: Partial<Customer>) {
  return rpc<Customer>(API_PATHS.customer.update, data, id)
}

export function customerStats() {
  return rpc<{ total: number; potential: number; active: number; inactive: number }>(API_PATHS.customer.stats)
}
