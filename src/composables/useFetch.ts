// 数据获取组合式函数。
//
// 约定（P0-3）：后端请求失败时**不得静默回退演示数据** —— 否则生产环境会把
// 演示数据当成真实数据展示（订单/财务/客户全部命中），且排障时极难发现。
// 仅在显式开启 `VITE_ALLOW_DEMO=true`（纯前端离线演示）时才允许回退。

import { reactive, ref } from 'vue'
import { ApiError } from '@/api/common/http'

/** 是否允许回退演示数据：默认关闭，仅本地演示时通过 .env.local 显式开启 */
export const ALLOW_DEMO = import.meta.env.VITE_ALLOW_DEMO === 'true'

export interface FetchResult<T> {
  data: T | null
  loading: boolean
  error: string
  source: 'api' | 'demo' | null
  load: () => Promise<void>
}

/**
 * 请求后端数据。
 * - 成功：返回 { data, source: 'api' }
 * - 401/403：原样抛出，交由 http 拦截器跳转登录
 * - 其他错误：**原样抛出**（仅当 ALLOW_DEMO 开启时才回退 fallback）
 */
export async function resolve<T>(
  real: () => Promise<T>,
  fallback?: () => T
): Promise<{ data: T; source: 'api' | 'demo' }> {
  try {
    const data = await real()
    return { data, source: 'api' }
  } catch (e) {
    if (e instanceof ApiError && (e.code === 401 || e.code === 403)) {
      throw e
    }
    if (ALLOW_DEMO && fallback) {
      return { data: fallback(), source: 'demo' }
    }
    throw e
  }
}

export function useFetch<T>(
  real: () => Promise<T>,
  fallback?: () => T,
  immediate = true
): FetchResult<T> {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref('')
  const source = ref<'api' | 'demo' | null>(null)

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const res = await resolve(real, fallback)
      data.value = res.data
      source.value = res.source
    } catch (e) {
      // 失败时清空数据，避免上一轮结果残留造成"接口挂了但页面还有数"的假象
      data.value = null
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      loading.value = false
    }
  }

  const state = reactive({ data, loading, error, source, load })

  if (immediate) {
    void state.load()
  }

  return state as unknown as FetchResult<T>
}
