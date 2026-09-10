import { rpc } from './common/http'
import type { Order, OrderDetail, OrderLog, OrderAddon, OrderReschedule, PageResult } from '@/types'
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

// ──── 订单加项 ────────────────────────────────────
// 增删改在后端同事务内重算订单 addon_amount/deposit_amt/final_amt/total_amt，
// 因此调用成功后需重新拉取订单详情，不要在前端自行累加金额。

export interface AddonParams {
  name: string
  category?: string // makeup-妆造 urgency-时效 service-服务 retouch-精修
  price?: number
  qty?: number
  confirmed?: number // 0-待确认 1-已确认
  remark?: string
}

export function listAddons(orderId: number) {
  return rpc<OrderAddon[]>(API_PATHS.order.addonList, {}, orderId)
}

export function createAddon(orderId: number, data: AddonParams) {
  return rpc<OrderAddon>(API_PATHS.order.addonCreate, data, orderId)
}

export function updateAddon(id: number, data: AddonParams) {
  return rpc<OrderAddon>(API_PATHS.order.addonUpdate, data, id)
}

export function deleteAddon(id: number) {
  return rpc<null>(API_PATHS.order.addonDelete, {}, id)
}

// ──── 订单改期 ────────────────────────────────────
// PC 不直接改订单 shoot_date（会漏掉档期锁重排），统一走改期单链路。

export function listReschedules(orderId: number) {
  return rpc<OrderReschedule[]>(API_PATHS.order.rescheduleList, {}, orderId)
}

export function applyReschedule(
  orderId: number,
  data: { new_date: string; new_time: string; reason_label?: string; reason?: string }
) {
  return rpc<OrderReschedule>(API_PATHS.order.rescheduleApply, data, orderId)
}

/** 改期审批：approved 必传（驳回落 false 也能被后端识别，不可省略） */
export function auditReschedule(id: number, approved: boolean, remark = '') {
  return rpc<null>(API_PATHS.order.rescheduleAudit, { approved, remark }, id)
}
