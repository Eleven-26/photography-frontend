// 数据获取组合式函数。
//
// 约定（P0-3 / P2-S2）：后端请求失败时**不得回退演示数据**，生产包不携带任何 mock。
// 请求失败即如实报错，避免把演示数据当成真实数据展示。
// 仅 401/403 由 http 拦截器接管（跳登录）。

import { reactive, ref } from 'vue'

export interface FetchResult<T> {
  data: T | null
  loading: boolean
  error: string
  /** 业务/HTTP 错误码（ApiError.code）；网络异常为 null */
  errorCode: number | null
  load: () => Promise<void>
}

export function useFetch<T>(real: () => Promise<T>, immediate = true): FetchResult<T> {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref('')
  const errorCode = ref<number | null>(null)
  // 请求序号：快速切换筛选时，旧响应不得覆盖新响应（消除竞态）
  let seq = 0

  async function load() {
    const current = ++seq
    loading.value = true
    error.value = ''
    errorCode.value = null
    try {
      const result = await real()
      if (current !== seq) return
      data.value = result
    } catch (e) {
      if (current !== seq) return
      // 失败时清空数据，避免上一轮结果残留造成"接口挂了但页面还有数"的假象
      data.value = null
      error.value = e instanceof Error ? e.message : '加载失败'
      errorCode.value =
        typeof (e as { code?: unknown })?.code === 'number' ? (e as { code: number }).code : null
    } finally {
      if (current === seq) loading.value = false
    }
  }

  const state = reactive({ data, loading, error, errorCode, load })

  if (immediate) {
    void state.load()
  }

  return state as unknown as FetchResult<T>
}
