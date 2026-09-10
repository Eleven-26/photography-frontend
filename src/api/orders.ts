import { rpc } from './common/http'
import type { Order, OrderDetail, OrderLog, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

export interface OrderListParams {
  status?: number | '' // 订单状态 int 枚举 0-7，见 ORDER_STATUS；'' 表示全部
  keyword?: string
  page?: number
  page_size?: number
}

/** 订单列表：筛选/分页参数走 POST body */
export function listOrders(params: OrderListParams = {}) {
  return rpc<PageResult<Order>>(API_PATHS.order.list, params as Record<string, unknown>)
}

/** 订单详情：返回包裹结构 { order, payments, refunds, logs, delivery } */
export function orderDetail(id: number) {
  return rpc<OrderDetail>(API_PATHS.order.detail, {}, id)
}

export function orderLogs(id: number) {
  return rpc<OrderLog[]>(API_PATHS.order.logs, {}, id)
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
  return rpc<Order>(API_PATHS.order.create, data)
}

export function updateOrder(id: number, data: Partial<Order>) {
  return rpc<Order>(API_PATHS.order.update, data, id)
}

export function updateOrderStatus(id: number, status: number) {
  return rpc<null>(API_PATHS.order.status, { status }, id)
}

export function cancelOrder(id: number, reason: string) {
  return rpc<null>(API_PATHS.order.cancel, { reason }, id)
}
