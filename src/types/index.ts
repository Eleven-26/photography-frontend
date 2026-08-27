// ── 与 photography-server 后端（Go/Gin + GORM）完全对齐的类型 ──
// 响应体：{ code, msg, data }  分页：{ list, total, page, page_size }
// 认证：Authorization: Bearer <token>
// 路由：POST /{module}/{action}[/:id]（公共：POST /auth/login）

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
  level: 'normal' | 'gold' | 'platinum' | 'diamond'
  source: string
  tags: string
  status: 'potential' | 'active' | 'inactive'
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
  status: 'pending' | 'quoting' | 'quoted' | 'confirmed' | 'lose'
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
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted'
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
  status: 'active' | 'draft' | 'offline'
  version: number
  base_version: number
  published_at?: string | null
}

// ──── 订单（biz_order）────────────────────────────
export type OrderStatus =
  | 'pending_deposit'
  | 'scheduled'
  | 'shooting'
  | 'retouching'
  | 'awaiting_delivery'
  | 'completed'
  | 'cancelled'

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
  status: OrderStatus
  payment_status: 'pending' | 'confirmed' | 'unpaid' | 'refunded'
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
export type PaymentStatus = 'pending' | 'confirmed' | 'refunded'

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
  status: PaymentStatus
  paid_at?: string | null
  voucher: string
  operator_id: number
  operator_name: string
  remark: string
}

// ──── 退款（biz_order_refund）────────────────────
export type RefundStatus = 'applying' | 'approved' | 'done' | 'rejected'

export interface Refund {
  id: number
  company_id: number
  order_id: number
  code: string
  customer_id: number
  amount: number
  reason: string
  refund_rule: string
  status: RefundStatus
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
export type DeliveryStage =
  | 'upload_pending'
  | 'selecting'
  | 'retouching'
  | 'deliver_ready'
  | 'completed'

export interface Delivery {
  id: number
  company_id: number
  code: string
  order_id: number
  customer_id: number
  customer_name: string
  stage: DeliveryStage
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
  status: 'draft' | 'published'
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

// ──── 档期 ────────────────────────────────────────
export interface CalendarSlot {
  id: number
  company_id: number
  date: string
  start_time: string
  end_time: string
  block_type: 'locked' | 'cancelled'
  order_id: number
  remark: string
  operator_id: number
}

// ──── 前端路由用的状态标签映射 ─────────────────────
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_deposit: '待定金',
  scheduled: '待拍摄',
  shooting: '拍摄中',
  retouching: '精修中',
  awaiting_delivery: '待交付',
  completed: '已完成',
  cancelled: '已取消'
}

export const LEAD_STATUS_LABEL: Record<string, string> = {
  pending: '待回复',
  quoting: '待报价',
  quoted: '已报价',
  confirmed: '已成交',
  lose: '已流失'
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: '待核验',
  confirmed: '已确认',
  unpaid: '待支付',
  refunded: '已退款'
}

export const REFUND_STATUS_LABEL: Record<string, string> = {
  applying: '申请中',
  approved: '已通过',
  done: '已退款',
  rejected: '已驳回'
}

export const DELIVERY_STAGE_LABEL: Record<string, string> = {
  upload_pending: '待上传样片',
  selecting: '客户选片中',
  retouching: '精修进行中',
  deliver_ready: '待确认交付',
  completed: '已交付'
}

export const CUSTOMER_LEVEL_LABEL: Record<string, string> = {
  normal: '普通',
  gold: '黄金',
  platinum: '铂金',
  diamond: '钻石'
}