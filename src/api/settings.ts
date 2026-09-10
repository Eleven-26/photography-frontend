import { rpc } from './common/http'
import type { OperationLog, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

export interface OperationLogParams {
  keyword?: string
  module?: string
  status?: number | '' // 1-成功 0-失败；'' 表示全部
  page?: number
  page_size?: number
}

/** 操作日志列表（设置页 · 安全与审计）：筛选/分页参数走 POST body */
export function listOperationLogs(params: OperationLogParams = {}) {
  return rpc<PageResult<OperationLog>>(API_PATHS.settings.operationLogList, params as Record<string, unknown>)
}
