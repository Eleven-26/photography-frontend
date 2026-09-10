<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { initials, relativeTime } from '@/utils/format'
import * as notifApi from '@/api/notifications'
import type { Notification } from '@/types'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const app = useAppStore()

const collapsed = computed(() => app.sidebarCollapsed)
const mobileOpen = computed(() => app.mobileNavOpen)
const userName = computed(() => auth.user?.nickname || auth.user?.username || '主理人')
const userRole = computed(() => auth.user?.role_name || '主理人')

const query = ref('')

/* ── 通知中心 ─────────────────────────────────── */
const notifOpen = ref(false)
const unread = ref(0)
const notifList = ref<Notification[]>([])
const notifLoading = ref(false)
const notifError = ref('')
let timer: ReturnType<typeof setInterval> | null = null

async function loadUnread() {
  try {
    const res = await notifApi.unreadCount()
    unread.value = res?.unread ?? 0
  } catch {
    /* 未读数失败不打扰用户，静默保持旧值 */
  }
}

async function loadNotifications() {
  notifLoading.value = true
  notifError.value = ''
  try {
    const res = await notifApi.listNotifications({ page: 1, page_size: 20 })
    notifList.value = res?.list || []
  } catch (e) {
    notifList.value = []
    notifError.value = e instanceof Error ? e.message : '通知加载失败'
  } finally {
    notifLoading.value = false
  }
}

function toggleNotifications() {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) void loadNotifications()
}

/** 通知点击跳转：按业务类型落到对应模块 */
function notifTarget(n: Notification) {
  if (n.biz_type === 'refund' || n.type === 'finance') return '/finance'
  if (n.biz_type === 'order' || n.type === 'order') return '/orders'
  return '/dashboard'
}

async function openNotification(n: Notification) {
  if (n.is_read !== 1) {
    try {
      await notifApi.markNotificationRead(n.id)
      n.is_read = 1
      unread.value = Math.max(0, unread.value - 1)
    } catch {
      /* 忽略：跳转优先 */
    }
  }
  notifOpen.value = false
  router.push(notifTarget(n))
}

async function readAll() {
  try {
    await notifApi.markAllNotificationsRead()
    notifList.value = notifList.value.map((n) => ({ ...n, is_read: 1 }))
    unread.value = 0
  } catch {
    /* 忽略 */
  }
}

onMounted(() => {
  void loadUnread()
  timer = setInterval(loadUnread, 60000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const navGroups = [  {
    label: '工作台',
    items: [
      { path: '/dashboard', title: '工作台', icon: 'M3 11.5 12 4l9 7.5', count: null }
    ]
  },
  {
    label: '客户与订单',
    items: [
      { path: '/orders', title: '订单管理', icon: 'M4 5l13 0M4 12l13 0M4 19l9 0', count: null },
      { path: '/leads', title: '线索与报价', icon: 'M4 6h16M4 12h16M4 18h10', count: null },
      { path: '/customers', title: '客户管理', icon: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 9a6 6 0 0 0-12 0', count: null }
    ]
  },
  {
    label: '排期与服务',
    items: [
      { path: '/calendar', title: '日程与档期', icon: 'M6 3v3M18 3v3M3.5 8h17', count: null },
      { path: '/delivery', title: '选片与精修', icon: 'M12 3 5 7v10l7 4 7-4V7l-7-4Z', count: null },
      { path: '/packages', title: '套餐管理', icon: 'M6 3h12l2 3H4l2-3Zm-1 3h14l-3 14H8L5 6Z', count: null },
      { path: '/portfolio', title: '作品集', icon: 'M3 5h18v14H3V5Zm6 0 4-4 4 4', count: null }
    ]
  },
  {
    label: '经营',
    items: [
      { path: '/finance', title: '财务与对账', icon: 'M6 4h12v16H6V4Zm0 5h12M9 14h6', count: null },
      { path: '/settings', title: '工作室设置', icon: 'm12 3 2 1 2-1 1 2 2 1-1 2 1 2-2 1-1 2-2-1-2 1-1-2-2-1 1-2-1-2 2-1 1-2ZM18 18l1 1', count: null }
    ]
  }
]

function isActive(path: string) {
  return route.path.startsWith(path)
}

function go(path: string) {
  app.closeMobileNav()
  router.push(path)
}

function doSearch() {
  const q = query.value.trim()
  if (!q) return
  router.push({ path: '/orders', query: { keyword: q } })
  query.value = ''
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="app-shell">
    <button
      v-if="mobileOpen"
      class="mobile-nav-backdrop"
      aria-label="关闭菜单"
      @click="app.closeMobileNav()"
    ></button>

    <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
      <div class="brand">
        <div class="brand-mark">S</div>
        <div class="brand-copy">
          <div class="brand-name">SLOT</div>
          <span class="brand-sub">STUDIO OS</span>
        </div>
      </div>

      <button class="space-switch" title="当前工作室">
        <span class="space-avatar">A</span>
        <span class="space-copy">
          <strong>Audi Shiraz</strong>
          <span>北京 · 朝阳大悦城</span>
        </span>
        <svg class="icon icon-drop" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      <nav>
        <div v-for="group in navGroups" :key="group.label">
          <div class="nav-label">{{ group.label }}</div>
          <button
            v-for="item in group.items"
            :key="item.path"
            class="nav-item"
            :class="{ 'router-link-active': isActive(item.path) }"
            @click="go(item.path)"
          >
            <svg class="icon" viewBox="0 0 24 24"><path :d="item.icon" /></svg>
            <span>{{ item.title }}</span>
            <span v-if="item.count != null" class="nav-count">{{ item.count }}</span>
          </button>
        </div>
      </nav>

      <div class="sidebar-foot">
        <span class="avatar">{{ initials(userName) }}</span>
        <div class="user-copy">
          <div class="user-name">{{ userName }}</div>
          <div class="user-role">{{ userRole }}</div>
        </div>
        <button title="退出登录" @click="logout">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    </aside>

    <div class="main-area" :class="{ 'sidebar-collapsed': collapsed }">
      <header class="topbar">
        <button class="mobile-menu-btn" @click="app.toggleMobileNav()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        <div class="crumbs">
          <div class="eyebrow">SLOT Studio</div>
          <div class="page-title">{{ route.meta.title }}</div>
        </div>

        <div class="top-search">
          <svg class="icon" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            v-model="query"
            placeholder="搜索订单、客户、档期…"
            @keyup.enter="doSearch"
          />
        </div>

        <div class="top-actions">
          <div class="notif-wrap">
            <button class="top-action" title="通知" @click="toggleNotifications">
              <svg class="icon" viewBox="0 0 24 24">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9.5 20a2.5 2.5 0 0 0 5 0" />
              </svg>
              <span v-if="unread > 0" class="notif-badge">{{ unread > 99 ? '99+' : unread }}</span>
            </button>

            <div v-if="notifOpen" class="notif-backdrop" @click="notifOpen = false"></div>
            <div v-if="notifOpen" class="notif-panel">
              <div class="notif-head">
                <strong>通知</strong>
                <span class="muted xsmall">{{ unread }} 条未读</span>
                <button class="btn btn-sm btn-ghost" style="margin-left: auto" @click="readAll">全部已读</button>
              </div>
              <div class="notif-list">
                <button
                  v-for="n in notifList"
                  :key="n.id"
                  class="notif-item"
                  :class="{ unread: n.is_read !== 1 }"
                  @click="openNotification(n)"
                >
                  <i class="notif-dot"></i>
                  <div class="notif-copy">
                    <div class="notif-title">{{ n.title }}</div>
                    <div class="notif-content">{{ n.content }}</div>
                    <div class="notif-time">{{ relativeTime(n.created_at) }}</div>
                  </div>
                </button>
                <div v-if="notifLoading" class="notif-empty">加载中…</div>
                <div v-else-if="notifError" class="notif-empty">{{ notifError }}</div>
                <div v-else-if="!notifList.length" class="notif-empty">暂无通知</div>
              </div>
            </div>
          </div>

          <button class="top-action" title="帮助">
            <svg class="icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .6-1 1.7m0 3h.01" />
            </svg>
          </button>
          <button v-if="!collapsed" class="top-action" title="收起侧边栏" @click="app.toggleSidebar()">
            <svg class="icon" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6M9 4H4v16h5" /></svg>
          </button>
        </div>
      </header>

      <main class="page-wrap">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.notif-wrap {
  position: relative;
  display: inline-flex;
}

.notif-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--red, #d64545);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 15px;
  text-align: center;
}

.notif-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.notif-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 330px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow-md, 0 12px 30px rgba(0, 0, 0, 0.12));
  z-index: 41;
  overflow: hidden;
}

.notif-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
  font-size: 12px;
}

.notif-list {
  overflow-y: auto;
  padding: 6px;
}

.notif-item {
  display: flex;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 9px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
}

.notif-item:hover {
  background: var(--cream, #faf7f2);
}

.notif-dot {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 50%;
  background: transparent;
}

.notif-item.unread .notif-dot {
  background: var(--orange);
}

.notif-copy {
  min-width: 0;
}

.notif-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink, #222);
}

.notif-content {
  font-size: 11px;
  color: var(--muted);
  margin-top: 3px;
  word-break: break-all;
}

.notif-time {
  font-size: 10px;
  color: var(--muted);
  margin-top: 4px;
}

.notif-empty {
  padding: 26px 10px;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
}
</style>