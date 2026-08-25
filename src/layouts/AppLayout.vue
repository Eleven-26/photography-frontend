<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { initials } from '@/utils/format'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const app = useAppStore()

const collapsed = computed(() => app.sidebarCollapsed)
const mobileOpen = computed(() => app.mobileNavOpen)
const userName = computed(() => auth.user?.nickname || auth.user?.username || '主理人')
const userRole = computed(() => auth.user?.role_name || '主理人')

const query = ref('')

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
          <button class="top-action" title="提醒">
            <svg class="icon" viewBox="0 0 24 24">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9.5 20a2.5 2.5 0 0 0 5 0" />
            </svg>
          </button>
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
</style>