/** API 前缀，rpc 与非 rpc 端点统一从这里取 */
export const API_PREFIX = '/api'

/**
 * 所有 API 路径（相对 API_PREFIX）
 * - auth 为非 RPC 端点，走 post（需自行拼接 API_PREFIX）
 * - 其余均为 RPC 风格，走 rpc（内部自动拼接 API_PREFIX）
 */
export const API_PATHS = {
  // 认证（非 RPC，走 post）
  auth: { login: '/auth/login' },
  // 用户
  user: {
    list: 'user/list',
    create: 'user/create',
    update: 'user/update',
    delete: 'user/delete',
    profile: 'user/profile',
    changePassword: 'user/change-password',
    logout: 'user/logout'
  },
  // 角色
  role: { list: 'role/list', create: 'role/create', update: 'role/update' },
  // 客户
  customer: {
    list: 'customer/list',
    detail: 'customer/detail',
    create: 'customer/create',
    update: 'customer/update',
    stats: 'customer/stats'
  },
  // 线索
  lead: {
    list: 'lead/list',
    detail: 'lead/detail',
    create: 'lead/create',
    update: 'lead/update',
    follow: 'lead/follow',
    convert: 'lead/convert'
  },
  // 订单
  order: {
    list: 'order/list',
    detail: 'order/detail',
    logs: 'order/logs',
    create: 'order/create',
    update: 'order/update',
    status: 'order/status',
    cancel: 'order/cancel'
  },
  // 套餐（package 为保留字，仅作对象 key，属性访问合法）
  package: {
    list: 'package/list',
    detail: 'package/detail',
    create: 'package/create',
    update: 'package/update',
    status: 'package/status'
  },
  // 财务
  finance: { summary: 'finance/summary', payments: 'finance/payments', refunds: 'finance/refunds' },
  // 收款
  payment: { confirm: 'payment/confirm' },
  // 退款
  refund: { audit: 'refund/audit' },
  // 档期
  calendar: { list: 'calendar/list', lock: 'calendar/lock', cancel: 'calendar/cancel' },
  // 作品
  asset: {
    list: 'asset/list',
    detail: 'asset/detail',
    create: 'asset/create',
    update: 'asset/update',
    delete: 'asset/delete'
  },
  // 工作台
  dashboard: { overview: 'dashboard/overview' }
} as const
