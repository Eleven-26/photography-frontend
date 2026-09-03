// ── 与后端 photography-server internal/enum 完全对齐的 int 枚举 ──
// 后端所有状态位已改为 tinyint 枚举，请求参数与响应字段统一使用数字。
// 修改此处时务必与后端 internal/enum/*.go 保持同步。

/** 订单状态（enum.OrderStatus） */
export const ORDER_STATUS = {
  PENDING_DEPOSIT: 1, // 待定金
  PENDING_SHOOT: 2, // 待拍摄
  SHOOTING: 3, // 拍摄中
  RETOUCHING: 4, // 精修中
  PENDING_DELIVERY: 5, // 待交付
  COMPLETED: 6, // 已完成
  CANCELLED: 7 // 已取消
} as const

export const ORDER_STATUS_LABEL: Record<number, string> = {
  [ORDER_STATUS.PENDING_DEPOSIT]: '待定金',
  [ORDER_STATUS.PENDING_SHOOT]: '待拍摄',
  [ORDER_STATUS.SHOOTING]: '拍摄中',
  [ORDER_STATUS.RETOUCHING]: '精修中',
  [ORDER_STATUS.PENDING_DELIVERY]: '待交付',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消'
}

/** 支付状态（enum.PaymentStatus，订单 payment_status 与收款单 status 共用） */
export const PAYMENT_STATUS = {
  PENDING: 1, // 待核验
  CONFIRMED: 2, // 已确认
  UNPAID: 3, // 待支付
  REFUNDED: 4 // 已退款
} as const

export const PAYMENT_STATUS_LABEL: Record<number, string> = {
  [PAYMENT_STATUS.PENDING]: '待核验',
  [PAYMENT_STATUS.CONFIRMED]: '已确认',
  [PAYMENT_STATUS.UNPAID]: '待支付',
  [PAYMENT_STATUS.REFUNDED]: '已退款'
}

/** 退款状态（enum.RefundStatus） */
export const REFUND_STATUS = {
  APPLYING: 1, // 申请中
  APPROVED: 2, // 已通过
  DONE: 3, // 已退款
  REJECTED: 4 // 已驳回
} as const

export const REFUND_STATUS_LABEL: Record<number, string> = {
  [REFUND_STATUS.APPLYING]: '申请中',
  [REFUND_STATUS.APPROVED]: '已通过',
  [REFUND_STATUS.DONE]: '已退款',
  [REFUND_STATUS.REJECTED]: '已驳回'
}

/** 线索状态（enum.LeadStatus） */
export const LEAD_STATUS = {
  PENDING: 1, // 待回复
  QUOTING: 2, // 待报价
  QUOTED: 3, // 已报价
  CONFIRMED: 4, // 已成交
  LOSE: 5 // 已流失
} as const

export const LEAD_STATUS_LABEL: Record<number, string> = {
  [LEAD_STATUS.PENDING]: '待回复',
  [LEAD_STATUS.QUOTING]: '待报价',
  [LEAD_STATUS.QUOTED]: '已报价',
  [LEAD_STATUS.CONFIRMED]: '已成交',
  [LEAD_STATUS.LOSE]: '已流失'
}

/** 报价单状态（enum.QuoteStatus） */
export const QUOTE_STATUS = {
  DRAFT: 1, // 草稿
  SENT: 2, // 已发送
  ACCEPTED: 3, // 已接受
  REJECTED: 4, // 已拒绝
  CONVERTED: 5 // 已成交
} as const

export const QUOTE_STATUS_LABEL: Record<number, string> = {
  [QUOTE_STATUS.DRAFT]: '草稿',
  [QUOTE_STATUS.SENT]: '已发送',
  [QUOTE_STATUS.ACCEPTED]: '已接受',
  [QUOTE_STATUS.REJECTED]: '已拒绝',
  [QUOTE_STATUS.CONVERTED]: '已成交'
}

/** 客户状态（enum.CustomerStatus） */
export const CUSTOMER_STATUS = {
  POTENTIAL: 1, // 潜在
  ACTIVE: 2, // 活跃
  INACTIVE: 3 // 流失/沉睡
} as const

export const CUSTOMER_STATUS_LABEL: Record<number, string> = {
  [CUSTOMER_STATUS.POTENTIAL]: '潜在客户',
  [CUSTOMER_STATUS.ACTIVE]: '活跃',
  [CUSTOMER_STATUS.INACTIVE]: '非活跃'
}

/** 客户等级（enum.CustomerLevel） */
export const CUSTOMER_LEVEL = {
  NORMAL: 1, // 普通
  GOLD: 2, // 黄金
  PLATINUM: 3, // 铂金
  DIAMOND: 4 // 钻石
} as const

export const CUSTOMER_LEVEL_LABEL: Record<number, string> = {
  [CUSTOMER_LEVEL.NORMAL]: '普通',
  [CUSTOMER_LEVEL.GOLD]: '黄金',
  [CUSTOMER_LEVEL.PLATINUM]: '铂金',
  [CUSTOMER_LEVEL.DIAMOND]: '钻石'
}

/** 套餐状态（enum.PackageStatus） */
export const PACKAGE_STATUS = {
  DRAFT: 1, // 草稿
  ACTIVE: 2, // 已上架
  OFFLINE: 3 // 已下线
} as const

export const PACKAGE_STATUS_LABEL: Record<number, string> = {
  [PACKAGE_STATUS.DRAFT]: '草稿',
  [PACKAGE_STATUS.ACTIVE]: '已上架',
  [PACKAGE_STATUS.OFFLINE]: '已下线'
}

/** 交付阶段（enum.DeliveryStage） */
export const DELIVERY_STAGE = {
  PENDING_SAMPLES: 1, // 待上传样片
  SELECTING: 2, // 客户选片中
  RETOUCHING: 3, // 精修进行中
  PENDING_CONFIRM: 4, // 待确认交付
  DELIVERED: 5 // 已交付
} as const

export const DELIVERY_STAGE_LABEL: Record<number, string> = {
  [DELIVERY_STAGE.PENDING_SAMPLES]: '待上传样片',
  [DELIVERY_STAGE.SELECTING]: '客户选片中',
  [DELIVERY_STAGE.RETOUCHING]: '精修进行中',
  [DELIVERY_STAGE.PENDING_CONFIRM]: '待确认交付',
  [DELIVERY_STAGE.DELIVERED]: '已交付'
}

/** 作品状态（enum.AssetStatus） */
export const ASSET_STATUS = {
  DRAFT: 1, // 草稿
  PUBLISHED: 2 // 已发布
} as const

export const ASSET_STATUS_LABEL: Record<number, string> = {
  [ASSET_STATUS.DRAFT]: '草稿',
  [ASSET_STATUS.PUBLISHED]: '已发布'
}

/** 档期锁定状态（enum.BlockStatus） */
export const BLOCK_STATUS = {
  LOCKED: 1, // 已锁定
  CANCELLED: 2 // 已取消
} as const

export const BLOCK_STATUS_LABEL: Record<number, string> = {
  [BLOCK_STATUS.LOCKED]: '已锁定',
  [BLOCK_STATUS.CANCELLED]: '已取消'
}

/** 通知已读状态（enum.NotificationReadStatus） */
export const NOTIFICATION_READ = {
  UNREAD: 0, // 未读
  READ: 1 // 已读
} as const
