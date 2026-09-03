// 演示数据兜底 — 与后端 Go 模型完全对齐的字段名
// 后端响应格式：{ code: 0, msg: "ok", data: { list, total, page, page_size } }

import type {
  Customer,
  Lead,
  Order,
  Payment,
  Refund,
  Package,
  Asset,
  DashboardOverview,
  FinanceSummary,
  CalendarSlot,
  PageResult,
  SysUser,
  SysRole
} from '@/types'

// ── 用户 ──────────────────────────────────────────
export const demoUser: SysUser = {
  id: 1,
  company_id: 1,
  store_id: 1,
  username: 'admin',
  nickname: '路鸿楼',
  mobile: '13800002874',
  email: 'admin@shotsu.studio',
  avatar: '',
  role_id: 1,
  status: 1,
  last_login_at: '2026-08-24T10:00:00+08:00',
  last_login_ip: '127.0.0.1'
}

export const demoRoles: SysRole[] = [
  { id: 1, company_id: 1, name: '超级管理员', code: 'admin', remark: '全部权限', status: 1 },
  { id: 2, company_id: 1, name: '店长', code: 'manager', remark: '门店管理', status: 1 },
  { id: 3, company_id: 1, name: '摄影师', code: 'photographer', remark: '拍摄', status: 1 },
  { id: 4, company_id: 1, name: '销售', code: 'sales', remark: '客户与订单', status: 1 }
]

// ── 客户 ──────────────────────────────────────────
export const demoCustomers: Customer[] = [
  {
    id: 1, company_id: 1, code: 'CU-000001', store_id: 1,
    name: '陈雨', mobile: '138****2874', wechat: 'chenyu88',
    gender: 'female', birthday: null, level: 1,
    source: '小红书', tags: '自然风格,亲子,户外',
    status: 2, remark: '孩子 5 岁', avatar: '',
    order_count: 1, total_amount: 2680
  },
  {
    id: 2, company_id: 1, code: 'CU-000002', store_id: 1,
    name: '蓝桥科技', mobile: '139****6018', wechat: '',
    gender: 'unknown', birthday: null, level: 4,
    source: '微信', tags: '企业客户,高价值,商务肖像',
    status: 2, remark: '团队形象照长期合作', avatar: '',
    order_count: 3, total_amount: 12800
  },
  {
    id: 3, company_id: 1, code: 'CU-000003', store_id: 1,
    name: '张明', mobile: '138****1928', wechat: 'zhangming99',
    gender: 'male', birthday: null, level: 2,
    source: '抖音', tags: '婚礼,高价值',
    status: 2, remark: '婚礼跟拍需双机位', avatar: '',
    order_count: 2, total_amount: 9600
  },
  {
    id: 4, company_id: 1, code: 'CU-000004', store_id: 1,
    name: '李芳', mobile: '137****6201', wechat: 'lifang2026',
    gender: 'female', birthday: null, level: 2,
    source: '预约主页', tags: '亲子,室内,复购',
    status: 2, remark: '偏好室内自然光', avatar: '',
    order_count: 4, total_amount: 6720
  },
  {
    id: 5, company_id: 1, code: 'CU-000005', store_id: 1,
    name: '王浩', mobile: '136****7762', wechat: '',
    gender: 'male', birthday: null, level: 1,
    source: '到店', tags: '证件照',
    status: 1, remark: '公司入职使用', avatar: '',
    order_count: 1, total_amount: 480
  }
]

// ── 线索 ──────────────────────────────────────────
export const demoLeads: Lead[] = [
  { id: 1, company_id: 1, code: 'LD-000001', store_id: 1, customer_id: 1, name: '陈雨', mobile: '138****2874', source: '小红书', project_type: '家庭写真', budget_min: 2000, budget_max: 3000, status: 4, shoot_date: '2026-08-08', remark: '自然风格', owner_id: 1, next_follow_at: null, follower: 2, last_follow_at: '2026-08-07T10:00:00+08:00' },
  { id: 2, company_id: 1, code: 'LD-000002', store_id: 1, customer_id: 2, name: '蓝桥科技', mobile: '139****6018', source: '微信', project_type: '商务肖像', budget_min: 0, budget_max: 0, status: 2, shoot_date: null, remark: '18 人团队', owner_id: 1, next_follow_at: '2026-08-25T10:00:00+08:00', follower: 1, last_follow_at: '2026-08-24T10:00:00+08:00' },
  { id: 3, company_id: 1, code: 'LD-000003', store_id: 1, customer_id: 3, name: '张明', mobile: '138****1928', source: '抖音', project_type: '婚礼跟拍', budget_min: 8000, budget_max: 12000, status: 3, shoot_date: '2026-10-01', remark: '双机位+快剪', owner_id: 2, next_follow_at: null, follower: 3, last_follow_at: '2026-08-23T10:00:00+08:00' },
  { id: 4, company_id: 1, code: 'LD-000004', store_id: 1, customer_id: 4, name: '李芳', mobile: '137****6201', source: '小红书', project_type: '家庭写真', budget_min: 1500, budget_max: 2000, status: 1, shoot_date: null, remark: '室内自然光', owner_id: 1, next_follow_at: '2026-08-26T10:00:00+08:00', follower: 0, last_follow_at: null },
  { id: 5, company_id: 1, code: 'LD-000005', store_id: 1, customer_id: 5, name: '王浩', mobile: '136****7762', source: '微信', project_type: '证件照', budget_min: 300, budget_max: 500, status: 2, shoot_date: null, remark: '公司入职', owner_id: 1, next_follow_at: '2026-08-25T14:00:00+08:00', follower: 1, last_follow_at: '2026-08-24T09:00:00+08:00' }
]

// ── 套餐 ──────────────────────────────────────────
export const demoPackages: Package[] = [
  { id: 1, company_id: 1, code: 'PK-000001', store_id: 1, name: '家庭纪念写真', cover: '', category: '家庭写真', base_price: 2680, deposit_rate: 20, deposit_amt: 536, photos_included: 15, shoot_hours: 2.5, content_desc: '精修 15 张 + 6×6 相册 + 8 寸相框', addon_unit_price: 80, status: 2, version: 1, base_version: 0, published_at: '2026-07-01T00:00:00+08:00' },
  { id: 2, company_id: 1, code: 'PK-000002', store_id: 1, name: '商务形象照', cover: '', category: '商务肖像', base_price: 1800, deposit_rate: 20, deposit_amt: 360, photos_included: 6, shoot_hours: 1.5, content_desc: '精修 6 张 + 电子版', addon_unit_price: 100, status: 2, version: 1, base_version: 0, published_at: '2026-07-01T00:00:00+08:00' },
  { id: 3, company_id: 1, code: 'PK-000003', store_id: 1, name: '婚礼跟拍', cover: '', category: '婚礼跟拍', base_price: 4800, deposit_rate: 30, deposit_amt: 1440, photos_included: 80, shoot_hours: 8, content_desc: '精修 80 张 + 相册', addon_unit_price: 60, status: 2, version: 1, base_version: 0, published_at: '2026-07-01T00:00:00+08:00' },
  { id: 4, company_id: 1, code: 'PK-000004', store_id: 1, name: '亲子写真', cover: '', category: '家庭写真', base_price: 1680, deposit_rate: 20, deposit_amt: 336, photos_included: 12, shoot_hours: 2, content_desc: '精修 12 张', addon_unit_price: 80, status: 2, version: 1, base_version: 0, published_at: '2026-07-01T00:00:00+08:00' },
  { id: 5, company_id: 1, code: 'PK-000005', store_id: 1, name: '自然人像', cover: '', category: '写真', base_price: 1680, deposit_rate: 20, deposit_amt: 336, photos_included: 10, shoot_hours: 2, content_desc: '精修 10 张', addon_unit_price: 80, status: 2, version: 1, base_version: 0, published_at: '2026-07-01T00:00:00+08:00' },
  { id: 6, company_id: 1, code: 'PK-000006', store_id: 1, name: '证件照', cover: '', category: '证件照', base_price: 480, deposit_rate: 100, deposit_amt: 480, photos_included: 1, shoot_hours: 0.5, content_desc: '1 版', addon_unit_price: 0, status: 2, version: 1, base_version: 0, published_at: '2026-07-01T00:00:00+08:00' }
]

// ── 订单 ──────────────────────────────────────────
export const demoOrders: Order[] = [
  { id: 1, company_id: 1, code: 'SL-260808-01', store_id: 1, customer_id: 1, customer_name: '陈雨', customer_mobile: '138****2874', lead_id: 1, quote_id: 0, package_id: 1, package_name: '家庭纪念写真', package_version: 1, base_price: 2680, addon_amount: 240, deposit_amt: 536, final_amt: 2384, total_amt: 2920, paid_amt: 536, refund_amt: 0, status: 2, payment_status: 1, shoot_date: '2026-08-08', shoot_time: '10:00-12:30', shoot_address: '越秀公园', photographer_id: 1, photographer: '路鸿楼', remark: '', cancel_reason: '', finished_at: null, owner_id: 1 },
  { id: 2, company_id: 1, code: 'SL-260808-02', store_id: 1, customer_id: 2, customer_name: '蓝桥科技', customer_mobile: '139****6018', lead_id: 2, quote_id: 0, package_id: 2, package_name: '商务形象照', package_version: 1, base_price: 1800, addon_amount: 0, deposit_amt: 360, final_amt: 1440, total_amt: 1800, paid_amt: 360, refund_amt: 0, status: 1, payment_status: 2, shoot_date: '2026-08-08', shoot_time: '14:00-16:00', shoot_address: '天河工作室', photographer_id: 1, photographer: '路鸿楼', remark: '', cancel_reason: '', finished_at: null, owner_id: 1 },
  { id: 3, company_id: 1, code: 'SL-260810-03', store_id: 1, customer_id: 3, customer_name: '张明', customer_mobile: '138****1928', lead_id: 3, quote_id: 0, package_id: 3, package_name: '婚礼跟拍', package_version: 1, base_price: 4800, addon_amount: 0, deposit_amt: 1440, final_amt: 3360, total_amt: 4800, paid_amt: 1440, refund_amt: 0, status: 2, payment_status: 2, shoot_date: '2026-08-10', shoot_time: '09:00-18:00', shoot_address: '广州香格里拉酒店', photographer_id: 2, photographer: '黄志强', remark: '', cancel_reason: '', finished_at: null, owner_id: 2 },
  { id: 4, company_id: 1, code: 'SL-260803-04', store_id: 1, customer_id: 4, customer_name: '李芳', customer_mobile: '137****6201', lead_id: 0, quote_id: 0, package_id: 4, package_name: '亲子写真', package_version: 1, base_price: 1680, addon_amount: 0, deposit_amt: 336, final_amt: 1344, total_amt: 1680, paid_amt: 336, refund_amt: 0, status: 4, payment_status: 2, shoot_date: '2026-08-03', shoot_time: '15:30-17:00', shoot_address: '海珠室内棚', photographer_id: 1, photographer: '路鸿楼', remark: '', cancel_reason: '', finished_at: null, owner_id: 1 },
  { id: 5, company_id: 1, code: 'SL-260806-05', store_id: 1, customer_id: 5, customer_name: '王浩', customer_mobile: '136****7762', lead_id: 5, quote_id: 0, package_id: 6, package_name: '证件照', package_version: 1, base_price: 480, addon_amount: 0, deposit_amt: 480, final_amt: 0, total_amt: 480, paid_amt: 0, refund_amt: 0, status: 1, payment_status: 3, shoot_date: '2026-08-06', shoot_time: '09:30-10:00', shoot_address: '天河工作室', photographer_id: 1, photographer: '路鸿楼', remark: '', cancel_reason: '', finished_at: null, owner_id: 1 }
]

// ── 收款 ──────────────────────────────────────────
export const demoPayments: Payment[] = [
  { id: 1, company_id: 1, order_id: 1, code: 'PM-000001', customer_id: 1, type: 'deposit', amount: 536, method_id: 0, method_name: '微信转账', status: 1, paid_at: '2026-08-08 09:16', voucher: '', operator_id: 0, operator_name: '', remark: '客户已申报' },
  { id: 2, company_id: 1, order_id: 2, code: 'PM-000002', customer_id: 2, type: 'deposit', amount: 360, method_id: 0, method_name: '微信转账', status: 4, paid_at: '2026-08-07 15:30', voucher: '', operator_id: 1, operator_name: '路鸿楼', remark: '已确认到账' }
]

// ── 退款 ──────────────────────────────────────────
export const demoRefunds: Refund[] = [
  { id: 1, company_id: 1, order_id: 2, code: 'RF-000001', customer_id: 2, amount: 360, reason: '时间冲突', refund_rule: '≥72h 退 100%', status: 1, apply_by: 1, apply_name: '蓝桥科技', audit_by: 0, audit_at: null, audit_remark: '', refund_at: null }
]

// ── 档期 ──────────────────────────────────────────
export const demoCalendarSlots: CalendarSlot[] = [
  { id: 1, company_id: 1, store_id: 1, order_id: 1, customer_id: 1, customer_name: '陈雨', date: '2026-08-24', time_range: '10:00-12:30', project_type: '家庭写真', photographer_id: 1, photographer: '路鸿楼', status: 1, remark: '家庭写真·陈雨', operator_id: 1 },
  { id: 2, company_id: 1, store_id: 1, order_id: 2, customer_id: 2, customer_name: '蓝桥科技', date: '2026-08-24', time_range: '14:00-16:00', project_type: '商务肖像', photographer_id: 1, photographer: '路鸿楼', status: 1, remark: '商务形象照·蓝桥科技', operator_id: 1 },
  { id: 3, company_id: 1, store_id: 1, order_id: 3, customer_id: 3, customer_name: '张明', date: '2026-08-26', time_range: '09:00-18:00', project_type: '婚礼跟拍', photographer_id: 2, photographer: '黄志强', status: 1, remark: '婚礼跟拍·张明', operator_id: 2 }
]

// ── 作品集 ────────────────────────────────────────
export const demoAssets: Asset[] = [
  { id: 1, company_id: 1, code: 'AS-000001', title: '家庭纪念写真合集', cover: 'linear-gradient(160deg,#cfe7dd,#7fb8a4)', category: '家庭写真', content: '', status: 2, published_at: '2026-08-01T00:00:00+08:00' },
  { id: 2, company_id: 1, code: 'AS-000002', title: '商务形象·蓝桥科技', cover: 'linear-gradient(160deg,#e5def2,#a894c9)', category: '商务肖像', content: '', status: 2, published_at: '2026-08-05T00:00:00+08:00' },
  { id: 3, company_id: 1, code: 'AS-000003', title: '林柚·自然人像', cover: 'linear-gradient(160deg,#fdeadd,#e2a97f)', category: '写真', content: '', status: 2, published_at: '2026-07-28T00:00:00+08:00' },
  { id: 4, company_id: 1, code: 'AS-000004', title: '张明婚礼纪实', cover: 'linear-gradient(160deg,#f4e7a9,#d9b64f)', category: '婚礼跟拍', content: '', status: 1, published_at: null },
  { id: 5, company_id: 1, code: 'AS-000005', title: '亲子时光·李芳', cover: 'linear-gradient(160deg,#f9dcd8,#e08a80)', category: '家庭写真', content: '', status: 2, published_at: '2026-08-03T00:00:00+08:00' }
]

// ── 演示汇总数据 ──────────────────────────────────
export function demoOverview(): DashboardOverview {
  return {
    today_orders: 2,
    today_amount: 2920,
    month_orders: 5,
    month_amount: 11680,
    pending_payments: 2,
    pending_deliveries: 1,
    new_leads: 3,
    overdue_leads: 1
  }
}

export function demoFinanceSummary(): FinanceSummary {
  return {
    month_receivable: 11680,
    month_received: 360,
    pending_verify_count: 1,
    pending_verify_amount: 536,
    refunding_count: 1,
    refunding_amount: 360
  }
}

export function demoCustomerStats() {
  return {
    total: demoCustomers.length,
    potential: demoCustomers.filter((c) => c.status === 1).length,
    active: demoCustomers.filter((c) => c.status === 2).length,
    inactive: demoCustomers.filter((c) => c.status === 3).length
  }
}

// ── 分页辅助 ──────────────────────────────────────
export function demoPage<T>(list: T[], page = 1, pageSize = 20): PageResult<T> {
  return { list: list.slice((page - 1) * pageSize, page * pageSize), total: list.length, page, page_size: pageSize }
}

export function demoOrdersPage(params: Record<string, unknown> = {}): PageResult<Order> {
  const keyword = String(params.keyword || '')
  const status = Number(params.status || 0)
  let list = demoOrders
  if (status) list = list.filter((o) => o.status === status)
  if (keyword) {
    const kw = keyword.toLowerCase()
    list = list.filter((o) => o.code.toLowerCase().includes(kw) || o.customer_name.includes(kw))
  }
  return demoPage(list, Number(params.page || 1), Number(params.page_size || 20))
}

export function demoLeadsPage(params: Record<string, unknown> = {}): PageResult<Lead> {
  const keyword = String(params.keyword || '')
  const status = Number(params.status || 0)
  let list = demoLeads
  if (status) list = list.filter((l) => l.status === status)
  if (keyword) {
    const kw = keyword.toLowerCase()
    list = list.filter((l) => l.name.includes(kw) || l.mobile.includes(kw) || l.project_type.includes(kw))
  }
  return demoPage(list, Number(params.page || 1), Number(params.page_size || 20))
}

export function demoCustomersPage(params: Record<string, unknown> = {}): PageResult<Customer> {
  const keyword = String(params.keyword || '')
  const status = Number(params.status || 0)
  let list = demoCustomers
  if (status) list = list.filter((c) => c.status === status)
  if (keyword) {
    const kw = keyword.toLowerCase()
    list = list.filter((c) => c.name.includes(kw) || c.mobile.includes(kw) || c.code.includes(kw))
  }
  return demoPage(list, Number(params.page || 1), Number(params.page_size || 20))
}

export function demoPackagesPage(): PageResult<Package> {
  return demoPage(demoPackages)
}

export function demoPaymentsPage(): PageResult<Payment> {
  return demoPage(demoPayments)
}

export function demoRefundsPage(): PageResult<Refund> {
  return demoPage(demoRefunds)
}

export function demoCalendarPage(): PageResult<CalendarSlot> {
  return demoPage(demoCalendarSlots)
}

export function demoAssetsPage(): PageResult<Asset> {
  return demoPage(demoAssets)
}

export function demoRolesPage(): PageResult<SysRole> {
  return demoPage(demoRoles)
}

export function demoUsersPage(): PageResult<SysUser> {
  return demoPage([demoUser])
}