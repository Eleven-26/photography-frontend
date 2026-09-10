import { rpc } from './common/http'
import type { Delivery, DeliveryItem } from '@/types'
import { API_PATHS } from './common/apiPath'

// ⚠️ 本模块所有接口的 id 均为 **order_id**（按订单反查交付单），
// 与后端 delivery/detail/:id、delivery/items/:id 的语义保持一致。

/** 交付单详情（按订单查）。订单尚未创建交付单时会失败，调用方需自行兜底为空态。 */
export function deliveryDetail(orderId: number) {
  return rpc<Delivery>(API_PATHS.delivery.detail, {}, orderId)
}

/** 交付文件明细。交付单不存在时后端返回空数组而非报错。 */
export function deliveryItems(orderId: number) {
  return rpc<DeliveryItem[]>(API_PATHS.delivery.items, {}, orderId)
}
