import { rpc } from './common/http'
import type { Asset, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

/** 作品列表：筛选/分页参数走 POST body */
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
  return rpc<Asset>(API_PATHS.asset.update, { ...data, id })
}

/**
 * 作品开关：发布状态 / 可见性 / 精选。
 * 与 updateAsset 分离，因为 update 的 title 是 required，不适合「只想取消精选」这类局部变更。
 */
export function setAssetFlags(
  id: number,
  flags: { status?: number; visibility?: number; featured?: number }
) {
  return rpc<null>(API_PATHS.asset.status, flags, id)
}

export function deleteAsset(id: number) {
  return rpc<null>(API_PATHS.asset.delete, {}, id)
}
