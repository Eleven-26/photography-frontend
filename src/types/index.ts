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
  ASSET_VISIBILITY,
  ASSET_VISIBILITY_LABEL,
  ASSET_AUTH,
  ASSET_AUTH_LABEL,
  BRIEF_ITEM_STATUS,
  BRIEF_ITEM_STATUS_LABEL,
  LEAD_MESSAGE_DIRECTION,
  BLOCK_STATUS,
  BLOCK_STATUS_LABEL,
  NOTIFICATION_READ,
  RESCHEDULE_STATUS,
  RESCHEDULE_STATUS_LABEL,
  RESCHEDULE_FEE_TYPE,
  RESCHEDULE_FEE_TYPE_LABEL,
  WEEKDAY_LABEL,
  SLOT_TEMPLATE_STATUS,
  PAYMENT_METHOD_TYPE,
  PAYMENT_METHOD_TYPE_LABEL,
  ORDER_SOURCE,
  ORDER_SOURCE_LABEL,
  DATA_SCOPE,
  DATA_SCOPE_LABEL,
  DATA_SCOPE_HINT
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
  /** 数据范围 1-全部 2-本门店 3-仅本人（后端 UserInfoVO 下发） */
  data_scope: number
  /** 权限点集合，如 ['order:view','order:update']；admin 为全量 */
  permissions: string[]
}

// ──── 系统 ──────────────────────────────────────────
export interface SysCompany {
  id: number
  name: string
  logo: string
  /** 所在城市 */
  city: string
  /** 工作室简介 */
  intro: string
  contact_name: string
  contact_phone: string
  address: string
  status: number
  /** 后端 model.Base 携带，设置页「创建于」用 */
  created_at?: string
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
  /** 数据范围 1-全部 2-本门店 3-仅本人 */
  data_scope: number
  /** 已配置的权限点数量（后端聚合返回，非数据库列） */
  permission_count: number
}

// ──── RBAC 权限配置（角色权限勾选树）─────────────────

/** 单个权限点的展示信息 */
export interface PermDesc {
  /** 权限点标识，如 order:view */
  key: string
  /** 中文名，如 查看订单 */
  label: string
}

/** 按业务模块分组的权限点集合（顺序即展示顺序） */
export interface PermGroup {
  module: string
  perms: PermDesc[]
}

/** 角色权限配置（/role/permissions/:id 回显结构） */
export interface RolePerms {
  role_id: number
  role_name: string
  role_code: string
  data_scope: number
  permissions: string[]
}

/** 保存角色权限的请求体（全量覆盖式） */
export interface RoleGrantParams {
  data_scope: number
  permissions: string[]
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
  /** 通知许可 0-不允许 1-允许 */
  allow_notifications: number | null
  /** 偏好风格（如 自然·生活感） */
  prefer_style: string
  /** 常用场景（如 户外公园） */
  prefer_scene: string
  order_count: number
  total_amount: number
  /** 满意度：该客户订单评价均分（保留 1 位小数，0=暂无评价），仅详情接口返回 */
  satisfaction: number
}

// ──── 客户统计（crm_customer 聚合）───────────────
export interface CustomerStats {
  total: number
  potential: number
  active: number
  inactive: number
  gold_up: number
  new_this_month: number
  /** 复购客户数（下单 ≥ 2 次） */
  repurchase_count: number
  /** 复购率 %（分母为有过下单的客户） */
  repurchase_rate: number
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
  shoot_time: string
  valid_until?: string | null
  duration_hours: number
  location: string
  people_count: string
  addons: string
  accept_at?: string | null
  order_id: number
  created_at?: string
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
  status: OrderStatus // 0-待确认 1-待定金 2-待拍摄 3-拍摄中 4-精修中 5-待交付 6-已完成 7-已取消
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
  /** 订单来源 1-管理端录入 2-客户预约 3-线索报价转化（ORDER_SOURCE） */
  source_type: number
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
  created_at?: string
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
  /** 原片数量（计划值，建单时录入） */
  raw_count: number
  /** 计划精修张数 */
  retouch_target: number
  sample_count: number
  selected_count: number
  retouched_count: number
  extra_selected_count: number
  extra_fee: number
  select_deadline?: string | null
  retouch_version: number
  selected_at?: string | null
  delivered_at?: string | null
  remark: string
  operator_id: number
}

// ──── 交付看板条目（biz_delivery JOIN biz_order 快照）──
/** 交付工作台列表项：交付单 + 订单编号/套餐/拍摄日期 */
export interface DeliveryListItem extends Delivery {
  order_code: string
  package_name: string
  shoot_date: string
}

// ──── 订单详情（后端 dto.OrderDetail 包裹结构）────
/**
 * 订单详情聚合体 — 与后端 `order/detail/:id` 返回结构一致。
 * ⚠️ 不是 Order 本身：订单主体在 `order` 字段，其余为关联集合。
 * 关联集合后端用 interface{} 承载，空值可能为 null，消费时需 `|| []` 兜底。
 */
export interface OrderDetail {
  order: Order
  payments: Payment[] | null
  refunds: Refund[] | null
  logs: OrderLog[] | null
  delivery: Delivery | null
  /**
   * 当前状态允许流转到的目标状态（后端领域状态机输出）。
   * 前端据此渲染「阶段推进」按钮，不在客户端重复实现状态机规则。
   * 旧版本后端可能不返回此字段，消费时需 `|| []` 兜底。
   */
  allowed_transitions: number[] | null
}

// ──── 订单加项（biz_order_addon）──────────────────
/** 加项分类（后端存字符串，见 model.OrderAddon.Category） */
export type AddonCategory = 'makeup' | 'urgency' | 'service' | 'retouch'

export interface OrderAddon {
  id: number
  company_id: number
  order_id: number
  name: string
  category: string // makeup-妆造 urgency-时效 service-服务 retouch-精修
  price: number
  qty: number
  amount: number // 小计 = price × qty
  confirmed: number // 0-待确认 1-已确认
  remark: string
}

// ──── 改期单（biz_order_reschedule）──────────────
/** 改期状态为后端 int 枚举，取值见 RESCHEDULE_STATUS（@/constants/enums） */
export type RescheduleStatus = number
/** 改期费用类型为后端 int 枚举，取值见 RESCHEDULE_FEE_TYPE（@/constants/enums） */
export type RescheduleFeeType = number

export interface OrderReschedule {
  id: number
  company_id: number
  code: string
  order_id: number
  customer_id: number
  original_date: string
  original_time: string
  new_date: string
  new_time: string
  fee_type: RescheduleFeeType // 1-免费 2-收调度费 3-不可改期
  fee_amount: number
  reason_label: string
  reason: string
  status: RescheduleStatus // 1-待确认 2-已同意 3-已拒绝 4-已取消
  apply_source: number // 1-管理端/摄影师发起 2-客户申请
  audit_by: number
  audit_name: string
  audit_at?: string | null
  audit_remark: string
}

// ──── 交付文件（biz_delivery_item）────────────────
export interface DeliveryItem {
  id: number
  company_id: number
  delivery_id: number
  order_id: number
  url: string
  file_type: string // image-图片 video-视频
  kind: string // sample-样片 selected-已选 retouched-精修成品
  filename: string
  size: number // 字节
  is_selected: number // 0-否 1-是
  feedback_content: string
  feedback_types: string
  feedback_priority: string
  feedback_status: number // 0-无 1-待处理 2-已处理
  handled_at?: string | null
  handle_remark: string
}

// ──── 作品集（biz_asset）────────────────────────
export interface Asset {
  id: number
  company_id: number
  code: string
  title: string
  category: string
  cover: string
  /** 作品图片，逗号分隔的 URL 串（不是数组） */
  images: string
  description: string
  photographer: string
  model: string
  location: string
  /** 拍摄日期 yyyy-MM-dd */
  shoot_date?: string | null
  /** 关联套餐ID，逗号分隔 */
  package_ids: string
  status: number // 作品状态 1-草稿 2-已发布（ASSET_STATUS）
  visibility: number // 可见性 1-公开 2-未公开（ASSET_VISIBILITY）
  featured: number // 精选展示（主页顶部）0-否 1-是
  authorization: number // 客户授权 1-待授权 2-已授权
  view_count: number
  published_at?: string | null
}

// ──── 线索沟通记录（biz_lead_message）─────────────
export interface LeadMessage {
  id: number
  company_id: number
  lead_id: number
  customer_id: number
  direction: number // 方向 1-客户发来 2-工作室发出
  channel: string // h5/wechat/sms/phone
  content: string
  msg_type: number // 1-文本 2-追问 3-报价通知 4-作品分享
  biz_id: number
  created_at?: string
}

// ──── 线索需求摘要项（biz_lead_brief_item）────────
export interface LeadBriefItem {
  id: number
  company_id: number
  lead_id: number
  title: string
  value: string // 已确认项的值
  question: string // 待追问项的问题
  ai_suggestion: string // AI 建议话术
  status: number // 1-待追问 2-已发送 3-已确认（BRIEF_ITEM_STATUS）
  affects_pricing: number // 0-否 1-是
  sort: number
  sent_at?: string | null
  confirmed_at?: string | null
}

// ──── 操作日志（sys_operation_log）───────────────
export interface OperationLog {
  id: number
  company_id: number
  user_id: number
  username: string
  module: string
  action: string
  method: string
  path: string
  params: string
  ip: string
  status: number // 1-成功 0-失败
  duration: number // 毫秒
  created_at?: string
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
  created_at?: string
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
  /** 待定金订单数 */
  pending_deposit: number
  /** 精修中订单数 */
  pending_retouch: number
  /** 未来待拍摄订单数 */
  upcoming_shoots: number
  /** 今日确认到账（同 today_amount） */
  today_confirmed: number
  /** 今日申报待核验金额 */
  today_pending: number
  /** 当前登录人未读通知数 */
  unread_notify: number
  /** 本月新增线索数（成交率分母） */
  month_leads: number
  /** 本月成交率 % = 本月新增订单 / 本月新增线索 */
  month_deal_rate: number
  /** 未来 7 天剩余可约时段数 */
  available_slots: number
  /** 今日拍摄列表 */
  today_shoots: TodayShoot[]
  /** 待办清单（后端已过滤 count=0 的条目） */
  todo_items: TodoItem[]
}

/** 今日拍摄条目（工作台） */
export interface TodayShoot {
  id: number
  code: string
  customer_name: string
  package_name: string
  shoot_time: string
  shoot_address: string
  photographer: string
  status: number
}

/** 工作台待办条目 */
export interface TodoItem {
  key: string
  label: string
  count: number
  route: string
  tone: 'danger' | 'warning' | 'normal'
}

// ──── 财务汇总 ────────────────────────────────────
export interface FinanceSummary {
  /** 本月应收（本月成交订单总额） */
  month_receivable: number
  /** 本月已确认到账 */
  month_received: number
  /** 本月剩余应收 = 应收 - 已收（负数归零） */
  month_remaining: number
  /** 待核验申报笔数（不计入已收，但已包含在应收内） */
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

// ──── 档期规则 / 工作室设置 / 收款方式 ──────────────

/** 档期时段模板（biz_slot_template）：按星期几定义常规可约时段 */
export interface SlotTemplate {
  id: number
  company_id: number
  store_id: number
  /** 摄影师ID，0=全店通用 */
  photographer_id: number
  /** 星期几 0-周日 1-周一 ... 6-周六 */
  weekday: number
  /** 开始时间 HH:mm */
  start_time: string
  /** 结束时间 HH:mm */
  end_time: string
  /** 1-启用 0-停用 */
  status: number
}

/** 工作室设置（biz_studio_setting）：预约主页 / 接单规则 / 改期政策 */
export interface StudioSetting {
  id: number
  company_id: number
  slogan: string
  intro: string
  /** 预约主页短链标识，非空即视为已发布 */
  homepage_slug: string
  /** 接收新预约 0-暂停 1-接收 */
  accept_new: number
  lock_minutes: number
  reschedule_free_hours: number
  reschedule_fee_rate: number
  reschedule_min_hours: number
  select_deadline_hours: number
  retain_days: number
  faq: string
  service_flow: string
}

/** 收款方式（biz_payment_method） */
export interface PaymentMethod {
  id: number
  company_id: number
  name: string
  /** 类型 wechat-微信 alipay-支付宝 bank-银行转账 cash-现金 other-其他 */
  type: string
  account_name: string
  account_no: string
  qrcode: string
  /** 1-启用 0-停用 */
  status: number
  sort: number
}

/** 工作空间聚合（settings/workspace） */
export interface Workspace {
  company: SysCompany
  stores: SysStore[] | null
  roles: SysRole[] | null
  payment_methods: PaymentMethod[] | null
}

// ──── 前端路由用的状态标签映射（数字 key，见 @/constants/enums）──
// ORDER_STATUS_LABEL / LEAD_STATUS_LABEL / PAYMENT_STATUS_LABEL /
// REFUND_STATUS_LABEL / DELIVERY_STAGE_LABEL / CUSTOMER_LEVEL_LABEL 等
// 已迁移至 @/constants/enums 并在此文件 re-export，请从 '@/types' 导入。