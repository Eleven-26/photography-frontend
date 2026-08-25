import { rpc } from './http'
import type { DashboardOverview } from '@/types'

export function overview() {
  return rpc<DashboardOverview>('dashboard', 'overview')
}