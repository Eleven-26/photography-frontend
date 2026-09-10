import { rpc } from './common/http'
import type { Delivery, DeliveryItem, DeliveryListItem, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

// ⚠️ 除 create（:order_id）与 remind（:id 为交付单ID）外，
// detail / items / upload-samples / select / upload-retouched / confirm 的 id
// 均为 **order_id**（按订单反查交付单），与后端语义保持一致。

export interface DeliveryListParams {
  /** 阶段筛选 1-4；0/不传 = 全部 */
  stage?: number
  keyword?: string
  page?: number
  page_size?: number
}

/** 交付工作台看板列表（含订单编号/套餐/拍摄日期快照） */
export function listDeliveries(params: DeliveryListParams = {}) {
  return rpc<PageResult<DeliveryListItem>>(API_PATHS.delivery.list, params as Record<string, unknown>)
}

export interface DeliveryCreateParams {
  /** 起始阶段 1-待上传样片 2-客户选片中 3-精修进行中 4-待确认交付 */
  stage?: number
  /** 负责人（员工ID，0=未指派） */
  operator_id?: number
  raw_count?: number
  retouch_target?: number
  /** YYYY-MM-DD HH:mm:ss */
  select_deadline?: string
  remark?: string
}

/** 新建交付任务（同一订单重复调用返回已存在的交付单，不会重复建单） */
export function createDelivery(orderId: number, data: DeliveryCreateParams = {}) {
  return rpc<Delivery>(API_PATHS.delivery.create, data, orderId)
}

/** 提醒交付负责人（未指派时广播给公司内启用员工） */
export function remindDelivery(deliveryId: number) {
  return rpc<null>(API_PATHS.delivery.remind, {}, deliveryId)
}

/** 交付单详情（按订单查）。订单尚未创建交付单时会失败，调用方需自行兜底为空态。 */
export function deliveryDetail(orderId: number) {
  return rpc<Delivery>(API_PATHS.delivery.detail, {}, orderId)
}

/** 交付文件明细。交付单不存在时后端返回空数组而非报错。 */
export function deliveryItems(orderId: number) {
  return rpc<DeliveryItem[]>(API_PATHS.delivery.items, {}, orderId)
}

export interface DeliveryItemParams {
  url: string
  file_type?: string
  kind?: string
  filename?: string
  size?: number
}

/** 批量上传样片 */
export function uploadSamples(orderId: number, items: DeliveryItemParams[]) {
  return rpc<null>(API_PATHS.delivery.uploadSamples, { items }, orderId)
}

/** 客户选片（业务上由 H5 触发，PC 端保留入口用于代客操作） */
export function selectDelivery(orderId: number, itemIds: number[]) {
  return rpc<null>(API_PATHS.delivery.select, { item_ids: itemIds }, orderId)
}

/** 批量上传精修成品 */
export function uploadRetouched(orderId: number, items: DeliveryItemParams[]) {
  return rpc<null>(API_PATHS.delivery.uploadRetouched, { items }, orderId)
}

/** 标记交付完成 */
export function confirmDelivery(orderId: number) {
  return rpc<null>(API_PATHS.delivery.confirm, {}, orderId)
}
