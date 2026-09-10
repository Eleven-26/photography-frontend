import { http } from './common/http'
import type { ApiResponse } from '@/types'
import { API_PREFIX } from './common/apiPath'

/** 上传结果（后端 service.UploadResult） */
export interface UploadResult {
  url: string
  file_name: string
  file_type: string
  size: number
}

const UPLOAD_PATH = `${API_PREFIX}/upload/file`

/**
 * 单文件上传（multipart/form-data，字段名 `file`）。
 * 大文件上传耗时可能超过默认 15s 超时，这里单独放宽到 60s。
 */
export function uploadFile(file: File, bizType = '', bizId = 0, storeId = 0): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  if (bizType) form.append('biz_type', bizType)
  if (bizId) form.append('biz_id', String(bizId))
  if (storeId) form.append('store_id', String(storeId))

  return http
    .request<ApiResponse<UploadResult>>({
      url: UPLOAD_PATH,
      method: 'POST',
      data: form,
      timeout: 60000
    })
    .then((res) => (res.data as ApiResponse<UploadResult>).data as UploadResult)
}

/** 批量上传，返回成功结果（失败项按索引从 errors 中查） */
export async function uploadFiles(
  files: File[],
  bizType = '',
  bizId = 0
): Promise<{ results: UploadResult[]; errors: { name: string; message: string }[] }> {
  const results: UploadResult[] = []
  const errors: { name: string; message: string }[] = []
  for (const f of files) {
    try {
      results.push(await uploadFile(f, bizType, bizId))
    } catch (e) {
      errors.push({ name: f.name, message: e instanceof Error ? e.message : '上传失败' })
    }
  }
  return { results, errors }
}
