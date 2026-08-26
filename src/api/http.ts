import axios, { type AxiosRequestConfig, AxiosError } from 'axios'
import type { ApiResponse } from '@/types'

/** 业务错误（后端 code != 0） */
export class ApiError extends Error {
  code: number
  detail?: unknown
  constructor(code: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.detail = detail
  }
}

const TOKEN_KEY = 'slot_token'

export const tokenStore = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },
  set(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
  timeout: 15000
})

http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    // 业务层错误码检查（拦截器不修改返回值，由 request() 解包）
    const body = response.data as ApiResponse
    if (body && typeof body === 'object' && 'code' in body && body.code !== 0) {
      throw new ApiError(Number(body.code), body.msg || '请求失败', body)
    }
    return response
  },
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      tokenStore.clear()
      if (window.location.pathname !== '/login') {
        const from = window.location.pathname + window.location.search
        window.location.href = `/login?redirect=${encodeURIComponent(from)}`
      }
      throw new ApiError(401, '登录已失效，请重新登录')
    }
    const message =
      error.response?.data?.msg ||
      (error.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '网络异常，请检查服务是否可用')
    throw new ApiError(error.response?.status || -1, message)
  }
)

/** 泛型请求助手：解包 data.data */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await http.request<ApiResponse<T>>(config)
  return (res.data as ApiResponse<T>).data as T
}

export const get = <T>(url: string, params?: Record<string, unknown>) =>
  request<T>({ url, method: 'GET', params })

export const post = <T>(url: string, data?: unknown) =>
  request<T>({ url, method: 'POST', data })

export const put = <T>(url: string, data?: unknown) =>
  request<T>({ url, method: 'PUT', data })

// ── 后端 RPC 风格：所有业务路由均为 POST ──
// /api/pc/{module}/{action}[/:id]
export const rpc = <T>(module: string, action: string, data?: unknown, id?: number | string) =>
  request<T>({ url: `/${module}/${action}${id != null ? `/${id}` : ''}`, method: 'POST', data })