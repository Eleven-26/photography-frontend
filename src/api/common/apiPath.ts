
// 1. 基础 URL（可根据环境自动切换）
export const BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || '/api'

// 2. 定义所有 API 路径（按模块分组，清晰可维护）
export const API_PATHS = {
  // 认证模块
  auth: {
    login: '/api/auth/login',
    logout: '/auth/logout',
    refreshToken: '/auth/refresh',
    getUserInfo: '/auth/me',
  },
  // 用户模块
  user: {
    list: '/users',
    detail: (id: string | number) => `/users/${id}`,
    update: (id: string | number) => `/users/${id}`,
    delete: (id: string | number) => `/users/${id}`,
  },
  // 订单模块
  order: {
    list: '/orders',
    create: '/create',
    detail: (id: string | number) => `/orders/${id}`,
  },

  // 客户模块
  customer: {
    list: '/customer/list',
    detail: (id: string | number) => `/customer/${id}`,
  },
  // ... 更多模块
} as const

// 3. 如果需要兼容不同版本（v1/v2），可以在这里统一控制
export const API_VERSION = '/v1'
export const BASE_URL_WITH_VERSION = BASE_URL + API_VERSION