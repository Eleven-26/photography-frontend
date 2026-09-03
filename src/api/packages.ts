import { rpc } from './common/http'
import type { Package, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

export function listPackages(params: Record<string, unknown> = {}) {
  return rpc<PageResult<Package>>(API_PATHS['package'].list, params)
}

export function packageDetail(id: number) {
  return rpc<Package>(API_PATHS['package'].detail, {}, id)
}

export function createPackage(data: Partial<Package>) {
  return rpc<Package>(API_PATHS['package'].create, data)
}

export function updatePackage(id: number, data: Partial<Package>) {
  return rpc<Package>(API_PATHS['package'].update, data, id)
}

export function setPackageStatus(id: number, status: number) {
  return rpc<null>(API_PATHS['package'].status, { status }, id)
}
