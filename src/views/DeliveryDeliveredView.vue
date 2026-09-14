<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import * as deliveryApi from '@/api/delivery'
import { useFetch } from '@/composables/useFetch'
import { formatDate } from '@/utils/format'
import type { DeliveryListItem } from '@/types'
import { DELIVERY_STAGE } from '@/types'

/**
 * 已交付列表（DELIVERY_STAGE.DELIVERED = 5）。
 *
 * 为什么单独一页：交付看板只渲染 stage 1–4 四条泳道（见 DeliveryView 的 LANES），
 * 已交付的交付单不进泳道，若没有本页就**完全无处可见** —— 用户看不到自己刚交付完的任务。
 * 数据源仍是 `/delivery/list`，用 `stage=5` 过滤，不新增后端接口。
 */
const router = useRouter()

const page = useFetch(() => deliveryApi.listDeliveries({ stage: DELIVERY_STAGE.DELIVERED, page: 1, page_size: 200 }))
const rows = computed<DeliveryListItem[]>(() => page.data?.list || [])

const stats = computed(() => {
  const list = rows.value
  const totalRetouched = list.reduce((sum, d) => sum + (d.retouched_count || 0), 0)
  // 最近一次交付时间（后端已按 id DESC 返回，这里再显式取最大 delivered_at 以防排序变化）
  const latest = list
    .map((d) => d.delivered_at || '')
    .filter(Boolean)
    .sort()
    .pop()
  return { count: list.length, totalRetouched, latest }
})

function goBoard() {
  router.push('/delivery')
}

function openOrder(d: DeliveryListItem) {
  if (!d.order_id) return
  router.push({ path: '/orders', query: { id: String(d.order_id) } })
}
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>已交付</h1>
        <p>已完结的交付单归档：样片、选片、精修到客户确认完成的全过程结果。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="goBoard">
          <svg class="icon" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
          返回看板
        </button>
        <button class="btn btn-outline" @click="page.load()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
      </div>
    </div>

    <div v-if="page.error" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      已交付数据加载失败：{{ page.error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="page.load()">重试</button>
    </div>

    <div class="stats-grid stats-3">
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-mint">交</span>已交付单数</div>
        <div class="stat-value">{{ stats.count }}</div>
        <div class="stat-sub">客户已确认完成的交付</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-lav">片</span>交付成片</div>
        <div class="stat-value">{{ stats.totalRetouched }}</div>
        <div class="stat-sub">精修成品合计（张）</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-orange">时</span>最近交付</div>
        <div class="stat-value" style="font-size: 18px">{{ stats.latest ? formatDate(stats.latest) : '—' }}</div>
        <div class="stat-sub">最新一次交付完成时间</div>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>交付单号</th>
            <th>客户</th>
            <th>订单号</th>
            <th>套餐</th>
            <th>拍摄日期</th>
            <th>精修成片</th>
            <th>交付时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in rows" :key="d.id">
            <td><b>{{ d.code }}</b></td>
            <td>{{ d.customer_name || '未命名客户' }}</td>
            <td class="muted">{{ d.order_code || `订单 #${d.order_id}` }}</td>
            <td>{{ d.package_name || '—' }}</td>
            <td class="muted">{{ d.shoot_date ? formatDate(d.shoot_date) : '—' }}</td>
            <td>V{{ d.retouch_version }} · {{ d.retouched_count }} 张</td>
            <td class="muted">{{ d.delivered_at ? formatDate(d.delivered_at) : '—' }}</td>
            <td>
              <button class="btn btn-sm btn-outline" @click="openOrder(d)">查看订单</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!rows.length && !page.loading" class="empty-state">
        <strong>暂无已交付任务</strong>
        <p>在交付看板里把任务推进到「待确认交付」并标记交付后，会归档到这里。</p>
      </div>
    </div>
  </div>
</template>
