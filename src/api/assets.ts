import { rpc } from './common/http'
import type { Asset, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

export function listAssets(params: Record<string, unknown> = {}) {
  return rpc<PageResult<Asset>>(API_PATHS.asset.list, params)
}

export function assetDetail(id: number) {
  return rpc<Asset>(API_PATHS.asset.detail, {}, id)
}

export function createAsset(data: Partial<Asset>) {
  return rpc<Asset>(API_PATHS.asset.create, data)
}

export function updateAsset(id: number, data: Partial<Asset>) {
  return rpc<Asset>(API_PATHS.asset.update, data, id)
}

export function deleteAsset(id: number) {
  return rpc<null>(API_PATHS.asset.delete, {}, id)
}
