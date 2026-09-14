import { createRouter, createWebHistory } from 'vue-router'
import { tokenStore } from '@/api/common/http'
import { useAuthStore } from '@/stores/auth'

// 路由元信息扩展：perm 声明进入该路由所需的权限点（见后端 internal/domain/perm.go）。
// 无 perm 的路由不做权限判定（如登录页、403 页、工作台兜底）。
declare module 'vue-router' {
  interface RouteMeta {
    /** 公开路由，无需登录 */
    public?: boolean
    /** 页面标题 */
    title?: string
    /** 访问所需权限点，如 order:view */
    perm?: string
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, title: '登录 · SLOT' }
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/views/ForbiddenView.vue'),
      meta: { title: '无访问权限' }
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: '工作台', perm: 'dashboard:view' }
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/OrdersView.vue'),
          meta: { title: '订单管理', perm: 'order:view' }
        },
        {
          path: 'leads',
          name: 'leads',
          component: () => import('@/views/LeadsView.vue'),
          meta: { title: '线索与报价', perm: 'lead:view' }
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: () => import('@/views/CalendarView.vue'),
          meta: { title: '日程与档期', perm: 'calendar:view' }
        },
        {
          path: 'customers',
          name: 'customers',
          component: () => import('@/views/CustomersView.vue'),
          meta: { title: '客户管理', perm: 'customer:view' }
        },
        {
          path: 'delivery',
          name: 'delivery',
          component: () => import('@/views/DeliveryView.vue'),
          meta: { title: '选片与精修', perm: 'delivery:view' }
        },
        {
          // 已交付归档：看板只渲染 stage 1-4，已交付(5)在此页展示
          path: 'delivery/delivered',
          name: 'delivery-delivered',
          component: () => import('@/views/DeliveryDeliveredView.vue'),
          meta: { title: '已交付', perm: 'delivery:view' }
        },
        {
          path: 'packages',
          name: 'packages',
          component: () => import('@/views/PackagesView.vue'),
          meta: { title: '套餐管理', perm: 'package:view' }
        },
        {
          path: 'portfolio',
          name: 'portfolio',
          component: () => import('@/views/PortfolioView.vue'),
          meta: { title: '作品集', perm: 'asset:view' }
        },
        {
          path: 'finance',
          name: 'finance',
          component: () => import('@/views/FinanceView.vue'),
          meta: { title: '财务与对账', perm: 'finance:view' }
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '工作室设置', perm: 'settings:view' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard'
    }
  ]
})

router.beforeEach(async (to) => {
  const hasToken = !!tokenStore.get()
  if (!to.meta.public && !hasToken) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.name === 'login' && hasToken) {
    return { name: 'dashboard' }
  }
  document.title = `${String(to.meta.title || 'SLOT')} · SLOT 摄影师后台`

  const perm = to.meta.perm
  if (perm && !to.meta.public) {
    const auth = useAuthStore()
    // 刷新页面时 user 尚未加载（App.vue 的 fetchMe 在挂载后才执行），
    // 若直接判定会拿到空权限被误拦。此处先补齐用户信息；失败则回登录页。
    if (hasToken && !auth.user) {
      try {
        await auth.fetchMe()
      } catch {
        auth.logout()
        return { name: 'login' }
      }
    }
    if (!auth.hasPerm(perm)) {
      return { name: 'forbidden', query: { from: to.fullPath } }
    }
  }
  return true
})

export default router
