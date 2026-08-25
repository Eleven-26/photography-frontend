// 数据获取组合式函数：优先请求后端 API，失败时自动回退到演示数据，
// 保证前后端分离环境下前端项目可独立运行与演示（页面顶部有来源提示）。

import { reactive, ref } from 'vue'
import { ApiError } from '@/api/http'

export interface FetchResult<T> {
  data: T | null
  loading: boolean
  error: string
  source: 'api' | 'demo' | null
  load: () => Promise<void>
}

/** 请求后端，后端不可用/未实现时回退演示数据源（401/403 除外，交由全局跳转登录） */
export async function resolve<T>(
  real: () => Promise<T>,
  fallback: () => T
): Promise<{ data: T; source: 'api' | 'demo' }> {
  try {
    const data = await real()
    return { data, source: 'api' }
  } catch (e) {
    if (e instanceof ApiError && (e.code === 401 || e.code === 403)) {
      throw e
    }
    return { data: fallback(), source: 'demo' }
  }
}

export function useFetch<T>(
  real: () => Promise<T>,
  fallback: () => T,
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