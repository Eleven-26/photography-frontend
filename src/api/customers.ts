import { rpc } from './http'
import type { Customer, PageResult } from '@/types'

export interface CustomerListParams {
  keyword?: string
  status?: string
  level?: string
  page?: number
  page_size?: number
}

export function listCustomers(params: CustomerListParams = {}) {
  return rpc<PageResult<Customer>>('customer', 'list', params)
}

export function customerDetail(id: number) {
  return rpc<Customer>('customer', 'detail', {}, id)
}

export function createCustomer(data: Partial<Customer>) {
  return rpc<Customer>('customer', 'create', data)
}

export function updateCustomer(id: number, data: Partial<Customer>) {
  return rpc<Customer>('customer', 'update', data, id)
}

export function customerStats() {
  return rpc<{ total: number; potential: number; active: number; inactive: number }>('customer', 'stats')
}