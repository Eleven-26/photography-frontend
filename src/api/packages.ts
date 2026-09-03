import { rpc } from './common/http'
import type { Package, PageResult } from '@/types'

export function listPackages(params: Record<string, unknown> = {}) {
  return rpc<PageResult<Package>>('package', 'list', params)
}

export function packageDetail(id: number) {
  return rpc<Package>('package', 'detail', {}, id)
}

export function createPackage(data: Partial<Package>) {
  return rpc<Package>('package', 'create', data)
}

export function updatePackage(id: number, data: Partial<Package>) {
  return rpc<Package>('package', 'update', data, id)
}

export function setPackageStatus(id: number, status: number) {
  return rpc<null>('package', 'status', { status }, id)
}