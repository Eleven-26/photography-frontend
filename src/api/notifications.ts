import { rpc } from './common/http'
import type { Notification, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

export interface NotificationListParams {
  page?: number
  page_size?: number
  /** 1 = 仅未读 */
  unread?: number | ''
}

/** 通知列表：筛选/分页参数走 POST body */
export function listNotifications(params: NotificationListParams = {}) {
  return rpc<PageResult<Notification>>(API_PATHS.notification.list, params as Record<string, unknown>)
}

/** 未读数（铃铛红点） */
export function unreadCount() {
  return rpc<{ unread: number }>(API_PATHS.notification.unreadCount, {})
}

export function markNotificationRead(id: number) {
  return rpc<null>(API_PATHS.notification.read, {}, id)
}

export function markAllNotificationsRead() {
  return rpc<null>(API_PATHS.notification.readAll, {})
}
