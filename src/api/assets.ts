import { rpc } from './http'
import type { Asset, PageResult } from '@/types'

export function listAssets(params: Record<string, unknown> = {}) {
  return rpc<PageResult<Asset>>('asset', 'list', params)
}

export function assetDetail(id: number) {
  return rpc<Asset>('asset', 'detail', {}, id)
}

export function createAsset(data: Partial<Asset>) {
  return rpc<Asset>('asset', 'create', data)
}

export function updateAsset(id: number, data: Partial<Asset>) {
  return rpc<Asset>('asset', 'update', data, id)
}

export function deleteAsset(id: number) {
  return rpc<null>('asset', 'delete', {}, id)
}