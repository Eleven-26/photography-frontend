<script setup lang="ts">
import { computed } from 'vue'
import AppToast from '@/components/AppToast.vue'
import * as dashboardApi from '@/api/dashboard'
import * as demo from '@/api/demo'
import { useFetch } from '@/composables/useFetch'
import { money, moneyShort, ORDER_STATUS_LABEL, orderTone } from '@/utils/format'

const overview = useFetch(() => dashboardApi.overview(), () => demo.demoOverview())

const sourceTip = computed(() => {
  const s = overview.source
  return s === 'demo' ? '演示数据（后端未连接）' : s === 'api' ? '实时数据' : ''
})

const recentOrders = demo.demoOrders.slice(0, 5)
</script>

<template>
  <div class="dashboard">
    <AppToast />

    <div class="page-head">
      <div>
        <h1>工作台</h1>
        <p v-if="sourceTip">数据来源：{{ sourceTip }}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="overview.load()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
        <button class="btn btn-primary">+ 新订单</button>
      </div>
    </div>

    <div v-if="sourceTip" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
      {{ sourceTip }} — 连接后端 API 后自动切换。
    </div>

    <div class="stats-grid stats-4">
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

@media (max-width: 800px) {
  .order-row {
    grid-template-columns: 1fr 1fr;
    row-gap: 6px;
  }

  .order-package,
  .order-date {
    display: none;
  }
}
</style>
