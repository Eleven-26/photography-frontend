// 数据获取组合式函数。
//
// 约定（P0-3 / P2-S2）：后端请求失败时**不得回退演示数据**，生产包不携带任何 mock。
// 请求失败即如实报错，避免把演示数据当成真实数据展示（订单/财务/客户全部命中却极难发现）。
// 仅 401/403 由 http 拦截器接管（跳登录）。

import { reactive, ref } from 'vue'

export interface FetchResult<T> {
  data: T | null
  loading: boolean
  error: string
  load: () => Promise<void>
}

export function useFetch<T>(real: () => Promise<T>, immediate = true): FetchResult<T> {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      data.value = await real()
    } catch (e) {
      // 失败时清空数据，避免上一轮结果残留造成"接口挂了但页面还有数"的假象
      data.value = null
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  const state = reactive({ data, loading, error, load })

  if (immediate) {
    void state.load()
  }

  return state as unknown as FetchResult<T>
}
