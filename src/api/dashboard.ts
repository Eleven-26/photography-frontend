import { rpc } from './common/http'
import type { DashboardOverview } from '@/types'
import { API_PATHS } from './common/apiPath'

export function overview() {
  return rpc<DashboardOverview>(API_PATHS.dashboard.overview)
}
