<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as orderApi from '@/api/orders'
import * as demo from '@/api/demo'
import { useFetch } from '@/composables/useFetch'
import { money, ORDER_STATUS_LABEL, orderTone, initials, formatDate } from '@/utils/format'
import type { Order, OrderLog } from '@/types'

const route = useRoute()

const query = reactive({
  status: '',
  keyword: String(route.query.keyword || ''),
  page: 1,
  page_size: 10
})

const statusTabs = [
  { key: '', label: '全部订单' },
  ...Object.entries(ORDER_STATUS_LABEL).map(([key, label]) => ({ key, label }))
]

const pageRes = useFetch(
  () => orderApi.listOrders(query),
  () => demo.demoOrdersPage(query as unknown as Record<string, unknown>)
)

const orders = computed(() => pageRes.data?.list || [])
const total = computed(() => pageRes.data?.total || 0)

watch(() => [query.status, query.page, query.keyword], () => {
  pageRes.load()
})

function search() {
  query.page = 1
  pageRes.load()
}

function setStatus(key: string) {
  query.status = key
  query.page = 1
}

function goPage(p: number) {
  query.page = p
}

const pillClass = (s: string) => {
  const t = orderTone(s)
  return { orange: 'status-pending', mint: 'status-ok', lav: 'status-info', red: 'status-error', gray: 'status-disabled' }[t]
}

// 订单详情
const detail = ref<Order | null>(null)
const detailOpen = ref(false)
const loadingDetail = ref(false)
const detailLogs = ref<OrderLog[]>([])

async function openDetail(o: Order) {
  detailOpen.value = true
  detail.value = null
  detailLogs.value = []
  loadingDetail.value = true
  try {
    try {
      const [ord, logs] = await Promise.all([
        orderApi.orderDetail(o.id),
        orderApi.orderLogs(o.id)
      ])
      detail.value = ord
      detailLogs.value = logs
    } catch {
      detail.value = o
      detailLogs.value = [
        { id: 1, company_id: 1, order_id: o.id, action: 'create', from_status: '', to_status: 'pending_deposit', content: '创建订单', operator_id: 1, operator_name: '路鸿楼' },
        { id: 2, company_id: 1, order_id: o.id, action: 'status', from_status: 'pending_deposit', to_status: o.status, content: `状态变更为 ${ORDER_STATUS_LABEL[o.status] || o.status}`, operator_id: 1, operator_name: '路鸿楼' }
      ]
    }
  } finally {
    loadingDetail.value = false
  }
}

// 新建订单
const createOpen = ref(false)
const saving = ref(false)
const form = reactive({
  customer_id: 1 as number,
  package_id: 0 as number,
  shoot_date: '',
  shoot_time: '',
  shoot_address: '',
  photographer_id: undefined as number | undefined,
  addon_amount: 0,
  remark: ''
})

async function saveOrder() {
  if (!form.package_id) {
    toastErr('请选择套餐')
    return
  }
  saving.value = true
  try {
    try {
      await orderApi.createOrder({
        customer_id: form.customer_id,
        package_id: form.package_id,
        shoot_date: form.shoot_date || undefined,
        shoot_time: form.shoot_time || undefined,
        shoot_address: form.shoot_address || undefined,
        photographer_id: form.photographer_id,
        addon_amount: form.addon_amount || undefined,
        remark: form.remark || undefined
      })
      toastOk('订单已创建')
    } catch {
      toastOk('订单已创建（演示模式）')
    }
    createOpen.value = false
    pageRes.load()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="orders">
    <AppToast />

    <div class="page-head">
      <div>
        <h1>订单管理</h1>
        <p>共 {{ total }} 笔订单 · 从新建到归档的全流程跟进。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="pageRes.load()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
        <button class="btn btn-primary" @click="createOpen = true">+ 新建订单</button>
      </div>
    </div>

    <div v-if="pageRes.source === 'demo'" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
      演示数据（后端未连接）— 新建操作返回演示成功。
    </div>

    <div class="tabs">
      <button
        v-for="s in statusTabs"
        :key="s.key"
        class="tab"
        :class="{ active: query.status === s.key }"
        @click="setStatus(s.key)"
      >
        {{ s.label }}{{ s.key ? '' : ` · ${total}` }}
      </button>
    </div>

    <div class="filter-bar">
      <div class="search-input">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          v-model="query.keyword"
          class="input"
          placeholder="搜索订单号 / 客户"
          @keyup.enter="search"
        />
      </div>
      <button class="btn btn-outline" @click="search">查询</button>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>订单</th>
              <th>客户</th>
              <th>套餐</th>
              <th>状态</th>
              <th>金额</th>
              <th>拍摄时间</th>
              <th>主拍</th>
              <th style="width: 80px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id">
              <td>
                <span class="cell-main">{{ o.code }}</span>
              </td>
              <td>
                <div class="flex gap-6">
                  <span class="avatar">{{ initials(o.customer_name) }}</span>
                  <span class="cell-main">{{ o.customer_name }}</span>
                </div>
              </td>
              <td>
                <span class="cell-main">{{ o.package_name }}</span>
              </td>
              <td>
                <span class="pill" :class="pillClass(o.status)">{{ ORDER_STATUS_LABEL[o.status] || o.status }}</span>
              </td>
              <td>
                <span class="cell-main">{{ money(o.total_amt) }}</span>
                <span class="cell-sub">定金 {{ money(o.deposit_amt) }}</span>
              </td>
              <td>
                <span class="cell-main">{{ formatDate(o.shoot_date) }}</span>
                <span class="cell-sub">{{ o.shoot_time || '未定' }} · {{ o.shoot_address || '—' }}</span>
              </td>
              <td>{{ o.photographer || '—' }}</td>
              <td>
                <button class="btn btn-sm btn-outline" @click="openDetail(o)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!orders.length && !pageRes.loading" class="empty-state">
        <strong>暂无订单</strong>
        <p>调整筛选条件或新建一笔订单。</p>
      </div>

      <div class="pager" v-if="total > query.page_size!">
        <span>共 {{ total }} 条</span>
        <div class="pager-pages">
          <button :disabled="query.page === 1" @click="goPage(query.page - 1)">‹</button>
          <button
            v-for="p in Array.from({ length: Math.ceil(total / query.page_size!) }, (_, i) => i + 1)"
            :key="p"
            :class="{ active: p === query.page }"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button :disabled="query.page! >= Math.ceil(total / query.page_size!)" @click="goPage(query.page + 1)">›</button>
        </div>
      </div>
    </div>

    <!-- 订单详情抽屉 -->
    <div v-if="detailOpen" class="drawer-backdrop" @click="detailOpen = false"></div>
    <div v-if="detailOpen" class="drawer">
      <div class="drawer-head">
        <h3>订单详情 · {{ detail?.code }}</h3>
        <button class="modal-close" style="margin-left: auto" @click="detailOpen = false">
          <svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="drawer-body" v-if="detail">
        <div class="detail-hero">
          <div>
            <div class="serif" style="font-size: 19px; font-weight: 700">{{ detail.customer_name }}</div>
            <div class="muted xsmall mt-8">{{ detail.package_name }}</div>
          </div>
          <div style="text-align: right">
            <div class="strong" style="font-size: 17px">{{ money(detail.total_amt) }}</div>
            <span class="pill mt-8" :class="pillClass(detail.status)">{{ ORDER_STATUS_LABEL[detail.status] || '—' }}</span>
          </div>
        </div>

        <div class="detail-grid">
          <div class="field"><span class="field-label">订单号</span><span>{{ detail.code }}</span></div>
          <div class="field"><span class="field-label">拍摄日期</span><span>{{ formatDate(detail.shoot_date) }} {{ detail.shoot_time }}</span></div>
          <div class="field"><span class="field-label">拍摄地点</span><span>{{ detail.shoot_address || '—' }}</span></div>
          <div class="field"><span class="field-label">主拍摄影师</span><span>{{ detail.photographer || '未分配' }}</span></div>
          <div class="field"><span class="field-label">定金</span><span>{{ money(detail.deposit_amt) }}</span></div>
          <div class="field"><span class="field-label">尾款</span><span>{{ money(detail.final_amt) }}</span></div>
        </div>

        <div class="divider"></div>
        <div class="section-title" style="margin-top: 0"><h2>动态时间线</h2></div>
        <div v-if="detailLogs.length" class="timeline">
          <div v-for="log in detailLogs" :key="log.id" class="tl-item">
            <span class="tl-dot"></span>
            <div>
              <div class="tl-content">{{ log.content }}</div>
              <div class="tl-meta">{{ log.operator_name }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state"><strong>暂无动态</strong></div>
      </div>
      <div class="drawer-body" v-else style="display: grid; place-items: center; color: var(--muted)">
        <span class="icon spin"><svg class="icon" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9" /></svg></span>
      </div>
      <div class="drawer-foot">
        <button class="btn btn-ghost" @click="detailOpen = false">关闭</button>
      </div>
    </div>

    <!-- 新建订单弹窗 -->
    <BaseModal :open="createOpen" title="新建订单" @close="createOpen = false">
      <form id="modal-form" class="form-grid form-grid-2" @submit.prevent="saveOrder">
        <div class="field">
          <label class="field-label">客户</label>
          <select v-model.number="form.customer_id" class="select">
            <option v-for="c in demo.demoCustomers" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 套餐</label>
          <select v-model.number="form.package_id" class="select">
            <option :value="0" disabled>请选择套餐</option>
            <option v-for="p in demo.demoPackages" :key="p.id" :value="p.id">{{ p.name }}（{{ money(p.base_price) }}）</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">拍摄日期</label>
          <input v-model="form.shoot_date" class="input" type="date" />
        </div>
        <div class="field">
          <label class="field-label">时段</label>
          <input v-model="form.shoot_time" class="input" placeholder="如 10:00-12:30" />
        </div>
        <div class="field">
          <label class="field-label">地点</label>
          <input v-model="form.shoot_address" class="input" placeholder="如 越秀公园" />
        </div>
        <div class="field">
          <label class="field-label">加片金额（元）</label>
          <input v-model.number="form.addon_amount" class="input" type="number" min="0" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">备注</label>
          <textarea v-model="form.remark" class="input" rows="2" placeholder="可选"></textarea>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<style scoped>
.detail-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 2px 0 16px;
  border-bottom: 1px dashed var(--line);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 18px;
  padding: 18px 0 4px;
}

.timeline {
  position: relative;
  padding-left: 18px;
}

.tl-item {
  position: relative;
  padding: 0 0 18px 6px;
  border-left: 2px solid var(--line);
  margin-left: 4px;
  padding-left: 16px;
}

.tl-item:last-child {
  border-left-color: transparent;
  padding-bottom: 0;
}

.tl-dot {
  position: absolute;
  left: -6px;
  top: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--orange);
  border: 2px solid var(--white);
  box-shadow: 0 0 0 2px var(--line);
}

.tl-content {
  font-size: 12px;
}

.tl-meta {
  font-size: 10px;
  color: var(--muted);
  margin-top: 3px;
}
</style>
