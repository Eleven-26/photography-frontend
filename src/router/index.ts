import { createRouter, createWebHistory } from 'vue-router'
import { tokenStore } from '@/api/common/http'

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
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: '工作台' }
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/OrdersView.vue'),
          meta: { title: '订单管理' }
        },
        {
          path: 'leads',
          name: 'leads',
          component: () => import('@/views/LeadsView.vue'),
          meta: { title: '线索与报价' }
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: () => import('@/views/CalendarView.vue'),
          meta: { title: '日程与档期' }
        },
        {
          path: 'customers',
          name: 'customers',
          component: () => import('@/views/CustomersView.vue'),
          meta: { title: '客户管理' }
        },
        {
          path: 'delivery',
          name: 'delivery',
          component: () => import('@/views/DeliveryView.vue'),
          meta: { title: '选片与精修' }
        },
        {
          path: 'packages',
          name: 'packages',
          component: () => import('@/views/PackagesView.vue'),
          meta: { title: '套餐管理' }
        },
        {
          path: 'portfolio',
          name: 'portfolio',
          component: () => import('@/views/PortfolioView.vue'),
          meta: { title: '作品集' }
        },
        {
          path: 'finance',
          name: 'finance',
          component: () => import('@/views/FinanceView.vue'),
          meta: { title: '财务与对账' }
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '工作室设置' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard'
    }
  ]
})

router.beforeEach((to) => {
  const hasToken = !!tokenStore.get()
  if (!to.meta.public && !hasToken) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.name === 'login' && hasToken) {
    return { name: 'dashboard' }
  }
  document.title = `${String(to.meta.title || 'SLOT')} · SLOT 摄影师后台`
  return true
})

export default router