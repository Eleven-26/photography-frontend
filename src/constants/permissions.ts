// 权限点常量表（唯一来源）。
//
// 与后端 photography-server/internal/domain/perm.go 一一对应：
// 路由 meta.perm、左侧菜单过滤、v-perm 按钮指令都应从这里引用，
// 避免字符串散落各处、拼写错误不被类型发现。
export const PERM = {
  dashboardView: 'dashboard:view',
  orderView: 'order:view',
  requestView: 'request:view',
  leadView: 'lead:view',
  calendarView: 'calendar:view',
  customerView: 'customer:view',
  deliveryView: 'delivery:view',
  packageView: 'package:view',
  assetView: 'asset:view',
  financeView: 'finance:view',
  settingsView: 'settings:view'
} as const

export type Perm = (typeof PERM)[keyof typeof PERM]
