import { rpc } from './common/http'
import type { Delivery, DeliveryItem, DeliveryListItem, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

// ⚠️ 路径参数语义（三端统一，以后端为准）：
// - create（:order_id）、detail / items（:id）→ **order_id**（按订单反查交付单）
// - remind / upload-samples / select / upload-retouched / confirm（:id）→ **delivery_id**
//   后端这几条按交付单主键查（DeliveryRepo.GetByID），传 order_id 会返回
//   40400「交付单不存在」（2026-09-14 上传精修 404 即此因）。
// 交付工作台列表项 / 详情返回的对象同时带 id（交付单主键）与 order_id，勿混用。

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
  return rpc<Delivery>(API_PATHS.delivery.create, { ...data, order_id: orderId })
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
  filename?: string
  size?: number
  // file_type / kind 不再由前端上报：file_type 服务端按 URL 后缀推导，
  // kind 由调用的接口决定（uploadSamples → 1 样片，uploadRetouched → 3 精修成品）。
}

/** 批量上传样片（:id 为交付单 ID） */
export function uploadSamples(deliveryId: number, items: DeliveryItemParams[]) {
  return rpc<null>(API_PATHS.delivery.uploadSamples, { items }, deliveryId)
}

/** 客户选片（业务上由 H5 触发，PC 端保留入口用于代客操作；:id 为交付单 ID） */
export function selectDelivery(deliveryId: number, itemIds: number[]) {
  return rpc<null>(API_PATHS.delivery.select, { item_ids: itemIds }, deliveryId)
}

/** 批量上传精修成品（:id 为交付单 ID） */
export function uploadRetouched(deliveryId: number, items: DeliveryItemParams[]) {
  return rpc<null>(API_PATHS.delivery.uploadRetouched, { items }, deliveryId)
}

/** 标记交付完成（:id 为交付单 ID） */
export function confirmDelivery(deliveryId: number) {
  return rpc<null>(API_PATHS.delivery.confirm, {}, deliveryId)
}
