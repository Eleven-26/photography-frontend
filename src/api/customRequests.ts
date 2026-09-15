import { rpc } from './common/http'
import { API_PATHS } from './common/apiPath'
import type { CustomRequest, Order, PageResult } from '@/types'

export interface CustomRequestListParams {
  /** 状态 1-待处理 2-已响应 3-已关闭；'' 或不传 = 全部 */
  status?: number | ''
  /** 按「客户指定的摄影师」筛选；0 或不传 = 不过滤（2026-09-15 新增） */
  photographer_id?: number
  page?: number
  page_size?: number
}

/**
 * 定制需求列表（H5 定制表单提交的数据）。
 * 与员工端 /wechat/staff/custom-request/list 是同一 Handler，返回 {list,total,page,page_size}。
 * 筛选/分页参数走 POST body（后端 params 只读 body，放 URL query 会被静默忽略）。
 */
export function listCustomRequests(params: CustomRequestListParams = {}) {
  return rpc<PageResult<CustomRequest>>(API_PATHS.customRequest.list, params as Record<string, unknown>)
}

/** 响应定制需求（:id 为定制需求主键），response 为回复/处理说明 */
export function respondCustomRequest(id: number, response: string) {
  return rpc<null>(API_PATHS.customRequest.respond, { response }, id)
}

export interface ConvertCustomRequestParams {
  /** 套餐ID（必填）：定制需求不含套餐，转订单须先选定 */
  package_id: number
  /** 客户ID：留空则由后端按需求手机号查档/建档 */
  customer_id?: number
  shoot_date?: string
  shoot_time?: string
  shoot_address?: string
  photographer_id?: number
  addon_amount?: number
  /** 备注：留空时后端自动拼装「来源：定制需求…」摘要 */
  remark?: string
}

/**
 * 定制需求转订单（:id 为定制需求主键）。
 * 后端复用 CreateOrder 全流程（金额拆分/客户快照/档期占位），
 * 成功后需求被置为「已响应」并写入「已转为订单 XXX」，避免重复转单。
 */
export function convertCustomRequest(id: number, data: ConvertCustomRequestParams) {
  return rpc<Order>(API_PATHS.customRequest.convert, data, id)
}
