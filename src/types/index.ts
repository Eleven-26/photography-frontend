// ── 与 photography-server 后端（Go/Gin + GORM）完全对齐的类型 ──
// 响应体：{ code, msg, data }  分页：{ list, total, page, page_size }
// 认证：Authorization: Bearer <token>
// 路由：POST /{module}/{action}[/:id]（公共：POST /auth/login）
// 状态位：后端已全部改为 tinyint int 枚举（见 @/constants/enums），
// 请求参数与响应中的 status/level/stage 等字段统一为 number。

export {
  ORDER_STATUS,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABEL,
  REFUND_STATUS,
  REFUND_STATUS_LABEL,
  LEAD_STATUS,
  LEAD_STATUS_LABEL,
  QUOTE_STATUS,
  QUOTE_STATUS_LABEL,
  CUSTOMER_STATUS,
  CUSTOMER_STATUS_LABEL,
  CUSTOMER_LEVEL,
  CUSTOMER_LEVEL_LABEL,
  PACKAGE_STATUS,
  PACKAGE_STATUS_LABEL,
  DELIVERY_STAGE,
  DELIVERY_STAGE_LABEL,
  ASSET_STATUS,
  ASSET_STATUS_LABEL,
  BLOCK_STATUS,
  BLOCK_STATUS_LABEL,
  NOTIFICATION_READ
} from '@/constants/enums'

/** 统一响应体 — 与后端 response.Body 对齐 */
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

/** 分页响应体 — 与后端 response.Page 对齐 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

// ──── 认证 ──────────────────────────────────────────
export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  expires_at: string
  user: AuthUser
}

export interface AuthUser {
  id: number
  username: string
  nickname: string
  mobile: string
  avatar: string
  role_id: number
  role_name: string
  role_code: string
  company_id: number
  store_id: number
}

// ──── 系统 ──────────────────────────────────────────
export interface SysCompany {
  id: number
  name: string
  logo: string
  contact_name: string
  contact_phone: string
  address: string
  status: number
}

export interface SysStore {
  id: number
  company_id: number
  name: string
  address: string
  phone: string
  status: number
}

export interface SysRole {
  id: number
  company_id: number
  name: string
  code: string
  remark: string
  status: number
}

export interface SysUser {
  id: number
  company_id: number
  store_id: number
  username: string
  nickname: string
  mobile: string
  email: string
  avatar: string
  role_id: number
  status: number
  last_login_at?: string | null
  last_login_ip: string
}

// ──── 客户（crm_customer）──────────────────────────
export interface Customer {
  id: number
  company_id: number
  code: string
  store_id: number
  name: string
  mobile: string
  wechat: string
  gender: 'male' | 'female' | 'unknown'
  birthday?: string | null
  level: number // 客户等级 1-普通 2-黄金 3-铂金 4-钻石
  source: string
  tags: string
  status: number // 客户状态 1-潜在 2-活跃 3-流失
  remark: string
  avatar: string
  order_count: number
  total_amount: number
}

// ──── 线索（crm_lead）─────────────────────────────
export interface Lead {
  id: number
  company_id: number
  code: string
  store_id: number
  customer_id: number
  name: string
  mobile: string
  source: string
  project_type: string
  budget_min: number
  budget_max: number
  status: number // 线索状态 1-待回复 2-待报价 3-已报价 4-已成交 5-已流失
  shoot_date?: string | null
  remark: string
  owner_id: number
  next_follow_at?: string | null
  follower: number
  last_follow_at?: string | null
}

// ──── 报价单（biz_quote）─────────────────────────
export interface Quote {
  id: number
  company_id: number
  code: string
  lead_id: number
  customer_id: number
  package_id: number
  version: number
  title: string
  package_name: string
  base_price: number
  addon_price: number
  total_price: number
  status: number // 报价单状态 1-草稿 2-已发送 3-已接受 4-已拒绝 5-已成交
  remark: string
  owner_id: number
  shoot_date?: string | null
}

// ──── 套餐（biz_package）────────────────────────
export interface Package {
  id: number
  company_id: number
  code: string
  store_id: number
  name: string
  cover: string
  category: string
  base_price: number
  deposit_rate: number
  deposit_amt: number
  photos_included: number
  shoot_hours: number
  content_desc: string
  addon_unit_price: number
  status: number // 套餐状态 1-草稿 2-已上架 3-已下线
  version: number
  base_version: number
  published_at?: string | null
}

// ──── 订单（biz_order）────────────────────────────
/** 订单状态为后端 int 枚举，取值见 ORDER_STATUS（@/constants/enums） */
export type OrderStatus = number

export interface Order {
  id: number
  company_id: number
  code: string
  store_id: number
  customer_id: number
  customer_name: string
  customer_mobile: string
  lead_id: number
  quote_id: number
  package_id: number
  package_name: string
  package_version: number
  base_price: number
  addon_amount: number
  deposit_amt: number
  final_amt: number
  total_amt: number
  paid_amt: number
  refund_amt: number
  status: OrderStatus // 1-待定金 2-待拍摄 3-拍摄中 4-精修中 5-待交付 6-已完成 7-已取消
  payment_status: number // 1-待核验 2-已确认 3-待支付 4-已退款
  shoot_date?: string | null
  shoot_time: string
  shoot_address: string
  photographer_id: number
  photographer: string
  remark: string
  cancel_reason: string
  finished_at?: string | null
  owner_id: number
}

// ──── 收款（biz_order_payment）────────────────────
/** 支付状态为后端 int 枚举，取值见 PAYMENT_STATUS（@/constants/enums） */
export type PaymentStatus = number

export interface Payment {
  id: number
  company_id: number
  order_id: number
  code: string
  customer_id: number
  type: 'deposit' | 'final' | 'addon'
  amount: number
  method_id: number
  method_name: string
  status: PaymentStatus // 1-待核验 2-已确认 3-待支付 4-已退款
  paid_at?: string | null
  voucher: string
  operator_id: number
  operator_name: string
  remark: string
}

// ──── 退款（biz_order_refund）────────────────────
/** 退款状态为后端 int 枚举，取值见 REFUND_STATUS（@/constants/enums） */
export type RefundStatus = number

export interface Refund {
  id: number
  company_id: number
  order_id: number
  code: string
  customer_id: number
  amount: number
  reason: string
  refund_rule: string
  status: RefundStatus // 1-申请中 2-已通过 3-已退款 4-已驳回
  apply_by: number
  apply_name: string
  audit_by: number
  audit_at?: string | null
  audit_remark: string
  refund_at?: string | null
}

// ──── 操作日志（biz_order_log）────────────────────
export interface OrderLog {
  id: number
  company_id: number
  order_id: number
  action: string
  from_status: string
  to_status: string
  content: string
  operator_id: number
  operator_name: string
}

// ──── 交付（biz_delivery）────────────────────────
/** 交付阶段为后端 int 枚举，取值见 DELIVERY_STAGE（@/constants/enums） */
export type DeliveryStage = number

export interface Delivery {
  id: number
  company_id: number
  code: string
  order_id: number
  customer_id: number
  customer_name: string
  stage: DeliveryStage // 1-待上传样片 2-客户选片中 3-精修进行中 4-待确认交付 5-已交付
  sample_count: number
  selected_count: number
  retouched_count: number
  selected_at?: string | null
  delivered_at?: string | null
  remark: string
  operator_id: number
}

// ──── 作品集（biz_asset）────────────────────────
export interface Asset {
  id: number
  company_id: number
  code: string
  title: string
  cover: string
  category: string
  content: string
  status: number // 作品状态 1-草稿 2-已发布
  published_at?: string | null
}

// ──── 通知（sys_notification）────────────────────
export interface Notification {
  id: number
  company_id: number
  receiver_id: number
  type: 'order' | 'finance' | 'system'
  title: string
  content: string
  biz_type: string
  biz_id: number
  is_read: number
  read_at?: string | null
}

// ──── 工作台汇总 ─────────────────────────────────
export interface DashboardOverview {
  today_orders: number
  today_amount: number
  month_orders: number
  month_amount: number
  pending_payments: number
  pending_deliveries: number
  new_leads: number
  overdue_leads: number
}

// ──── 财务汇总 ────────────────────────────────────
export interface FinanceSummary {
  month_receivable: number
  month_received: number
  pending_verify_count: number
  pending_verify_amount: number
  refunding_count: number
  refunding_amount: number
}

// ──── 档期（biz_calendar_block，字段与后端 CalendarBlock 对齐）───
export interface CalendarSlot {
  id: number
  company_id: number
  store_id: number
  order_id: number
  customer_id: number
  customer_name: string
  date: string
  time_range: string
  project_type: string
  photographer_id: number
  photographer: string
  status: number // 档期状态 1-已锁定 2-已取消
  remark: string
  operator_id: number
}

// ──── 前端路由用的状态标签映射（数字 key，见 @/constants/enums）──
// ORDER_STATUS_LABEL / LEAD_STATUS_LABEL / PAYMENT_STATUS_LABEL /
// REFUND_STATUS_LABEL / DELIVERY_STAGE_LABEL / CUSTOMER_LEVEL_LABEL 等
// 已迁移至 @/constants/enums 并在此文件 re-export，请从 '@/types' 导入。