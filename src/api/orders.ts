import { rpc } from './common/http'
import type { Order, OrderLog, PageResult } from '@/types'

export interface OrderListParams {
  status?: number | '' // 订单状态 int 枚举 1-7，见 ORDER_STATUS；'' 表示全部
  keyword?: string
  page?: number
  page_size?: number
}

export function listOrders(params: OrderListParams = {}) {
  return rpc<PageResult<Order>>('order', 'list', params)
}

export function orderDetail(id: number) {
  return rpc<Order>('order', 'detail', {}, id)
}

export function orderLogs(id: number) {
  return rpc<OrderLog[]>('order', 'logs', {}, id)
}

export function createOrder(data: {
  customer_id: number
  package_id: number
  shoot_date?: string
  shoot_time?: string
  shoot_address?: string
  photographer_id?: number
  addon_amount?: number
  remark?: string
}) {
  return rpc<Order>('order', 'create', data)
}

export function updateOrder(id: number, data: Partial<Order>) {
  return rpc<Order>('order', 'update', data, id)
}

export function updateOrderStatus(id: number, status: number) {
  return rpc<null>('order', 'status', { status }, id)
}

export function cancelOrder(id: number, reason: string) {
  return rpc<null>('order', 'cancel', { reason }, id)
}