<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import * as dashboardApi from '@/api/dashboard'
import * as orderApi from '@/api/orders'
import { useFetch } from '@/composables/useFetch'
import { money, moneyShort, ORDER_STATUS_LABEL, orderTone } from '@/utils/format'

const router = useRouter()

// 工作台概览 + 近期订单：数据全部来自后端，失败即提示，不回退演示数据
const overview = useFetch(() => dashboardApi.overview())
const recent = useFetch(() => orderApi.listOrders({ page: 1, page_size: 5 }))

const recentOrders = computed(() => recent.data?.list || [])
const todayShoots = computed(() => overview.data?.today_shoots || [])
const todoItems = computed(() => overview.data?.todo_items || [])
const loadError = computed(() => overview.error || recent.error)

function reload() {
  overview.load()
  recent.load()
}

function goTodo(route: string) {
  router.push(route)
}

const todoTone: Record<string, string> = {
  danger: 'tone-red',
  warning: 'tone-orange',
  normal: 'tone-lav'
}
</script>

<template>
  <div class="dashboard">

    <div class="page-head">
      <div>
        <h1>工作台</h1>
        <p>实时数据 · 今日概览</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="reload">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
        <button class="btn btn-primary" @click="router.push('/orders')">+ 新订单</button>
      </div>
    </div>

    <div v-if="loadError" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      加载失败：{{ loadError }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="reload">重试</button>
    </div>

    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))">
      <div class="stat-card">
        <div class="stat-head">
          <span class="stat-icon tone-orange"><svg class="icon" viewBox="0 0 24 24"><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 7h12M6 14h12M6 17h8" /></svg></span>
          今日订单
        </div>
        <div class="stat-value">{{ overview.data?.today_orders || 0 }}</div>
        <div class="stat-sub">¥{{ moneyShort(overview.data?.today_amount) }} 今日营收</div>
      </div>

      <div class="stat-card">
        <div class="stat-head">
          <span class="stat-icon tone-mint"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M15.5 9.5a3 3 0 0 0-3.5-3 3 3 0 0 0-3.5 3c0 2.5 7 2.5 7 5a3 3 0 0 1-3.5 3 3 3 0 0 1-3.5-3" /></svg></span>
          本月营收
        </div>
        <div class="stat-value">¥{{ moneyShort(overview.data?.month_amount) }}</div>
        <div class="stat-sub">{{ overview.data?.month_orders || 0 }} 笔订单</div>
      </div>

      <div class="stat-card">
        <div class="stat-head">
          <span class="stat-icon tone-lav"><svg class="icon" viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M8 15l3-4 3 3 4-6" /></svg></span>
          本月成交率
        </div>
        <div class="stat-value">{{ (overview.data?.month_deal_rate || 0).toFixed(1) }}%</div>
        <div class="stat-sub">{{ overview.data?.month_orders || 0 }} 成交 / {{ overview.data?.month_leads || 0 }} 线索</div>
      </div>

      <div class="stat-card">
        <div class="stat-head">
          <span class="stat-icon tone-mint"><svg class="icon" viewBox="0 0 24 24"><path d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" /></svg></span>
          可约档期
        </div>
        <div class="stat-value">{{ overview.data?.available_slots || 0 }}</div>
        <div class="stat-sub">未来 7 天剩余时段</div>
      </div>

      <div class="stat-card">
        <div class="stat-head">
          <span class="stat-icon tone-lav"><svg class="icon" viewBox="0 0 24 24"><path d="M6 4h12v16H6V4Zm0 5h12M9 14h6" /></svg></span>
          待处理
        </div>
        <div class="stat-value">{{ (overview.data?.pending_payments || 0) + (overview.data?.pending_deliveries || 0) }}</div>
        <div class="stat-sub">{{ overview.data?.pending_payments || 0 }} 笔待收款 · {{ overview.data?.pending_deliveries || 0 }} 笔待交付</div>
      </div>

      <div class="stat-card">
        <div class="stat-head">
          <span class="stat-icon tone-yellow"><svg class="icon" viewBox="0 0 24 24"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 9a6 6 0 0 0-12 0" /></svg></span>
          线索
        </div>
        <div class="stat-value">{{ overview.data?.new_leads || 0 }}</div>
        <div class="stat-sub">{{ overview.data?.overdue_leads || 0 }} 条逾期需跟进</div>
      </div>
    </div>

    <div class="dash-cols">
      <div class="card card-pad">
        <div class="section-title">
          <h2>待办清单</h2>
          <span>{{ todoItems.length }} 类</span>
        </div>
        <div v-if="todoItems.length" class="todo-list">
          <button v-for="t in todoItems" :key="t.key" class="todo-row" @click="goTodo(t.route)">
            <span class="stat-icon" :class="todoTone[t.tone] || 'tone-lav'">
              <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
            </span>
            <span class="todo-label">{{ t.label }}</span>
            <b class="todo-count">{{ t.count }}</b>
            <svg class="icon todo-arrow" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>
        <div v-else class="empty-state">
          <strong>暂无待办</strong>
          <p>所有事项都已处理完毕。</p>
        </div>
      </div>

      <div class="card card-pad">
        <div class="section-title">
          <h2>今日拍摄</h2>
          <span>{{ todayShoots.length }} 场</span>
        </div>
        <div v-if="todayShoots.length" class="shoot-list">
          <div v-for="s in todayShoots" :key="s.id" class="shoot-row">
            <div class="shoot-time">{{ s.shoot_time || '待定' }}</div>
            <div class="shoot-main">
              <div class="shoot-name">{{ s.customer_name }}</div>
              <div class="cell-sub">{{ s.code }} · {{ s.package_name || '—' }}</div>
            </div>
            <div class="shoot-addr">{{ s.shoot_address || '—' }}</div>
            <span class="pill" :class="orderTone(s.status)">{{ ORDER_STATUS_LABEL[s.status] || s.status }}</span>
          </div>
        </div>
        <div v-else class="empty-state">
          <strong>今日无拍摄</strong>
          <p>没有安排在今天拍摄的订单。</p>
        </div>
      </div>
    </div>

    <div class="card card-pad mt-16">
      <div class="section-title">
        <h2>近期订单</h2>
        <span>{{ recentOrders.length }} 笔</span>
      </div>
      <div class="order-list">
        <div v-for="o in recentOrders" :key="o.id" class="order-row">
          <div class="order-main">
            <span class="order-code">{{ o.code }}</span>
            <span class="pill" :class="orderTone(o.status)">{{ ORDER_STATUS_LABEL[o.status] || o.status }}</span>
          </div>
          <div class="order-customer">{{ o.customer_name }}</div>
          <div class="order-package">{{ o.package_name }}</div>
          <div class="order-amount">¥{{ money(o.total_amt) }}</div>
          <div class="order-date">{{ o.shoot_date }}</div>
        </div>
      </div>
      <div v-if="!recentOrders.length" class="empty-state">
        <strong>暂无订单</strong>
        <p>系统中还没有订单数据。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-list {
  display: flex;
  flex-direction: column;
}

.order-row {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1.2fr 1fr 0.8fr;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--line);
}

.order-row:last-child {
  border-bottom: 0;
}

.order-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.order-code {
  font-family: 'DM Sans', monospace;
  font-weight: 600;
  font-size: 13px;
  color: var(--ink);
  white-space: nowrap;
}

.order-customer,
.order-package {
  font-size: 13px;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-amount {
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
  color: var(--ink);
  text-align: right;
}

.order-date {
  font-size: 12px;
  color: var(--muted);
  text-align: right;
}

/* ── 待办 / 今日拍摄 双栏 ── */
.dash-cols {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 16px;
  margin-top: 16px;
}

.todo-list,
.shoot-list {
  display: flex;
  flex-direction: column;
}

.todo-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 2px;
  border: 0;
  border-bottom: 1px dashed var(--line);
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
}

.todo-row:last-child {
  border-bottom: 0;
}

.todo-row:hover .todo-label {
  color: var(--orange-dark);
}

.todo-label {
  font-size: 13px;
  color: var(--ink);
  transition: color 0.15s;
}

.todo-count {
  margin-left: auto;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: var(--ink);
}

.todo-arrow {
  width: 15px;
  height: 15px;
  color: var(--muted);
}

.shoot-row {
  display: grid;
  grid-template-columns: 76px 1.4fr 1.2fr auto;
  align-items: center;
  gap: 10px;
  padding: 11px 0;
  border-bottom: 1px dashed var(--line);
}

.shoot-row:last-child {
  border-bottom: 0;
}

.shoot-time {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: var(--ink-2);
}

.shoot-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.shoot-addr {
  font-size: 12px;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .dash-cols {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 800px) {
  .order-row {
    grid-template-columns: 1fr 1fr;
    row-gap: 6px;
  }

  .order-package,
  .order-date {
    display: none;
  }

  .shoot-row {
    grid-template-columns: 68px 1fr auto;
  }

  .shoot-addr {
    display: none;
  }
}
</style>
