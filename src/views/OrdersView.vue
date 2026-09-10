<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as orderApi from '@/api/orders'
import * as customerApi from '@/api/customers'
import * as packageApi from '@/api/packages'
import { useFetch } from '@/composables/useFetch'
import { money, formatDate, formatDateTime, initials, orderTone } from '@/utils/format'
import { ORDER_STATUS, ORDER_STATUS_LABEL, PAYMENT_STATUS, PAYMENT_STATUS_LABEL, PACKAGE_STATUS } from '@/types'
import type { Order, OrderLog, Payment, Refund, Customer, Package } from '@/types'

const route = useRoute()

const query = reactive({
  status: '' as number | '', // 订单状态 int 枚举 0-7，'' 为全部
  keyword: String(route.query.keyword || ''),
  page: 1,
  page_size: 10
})

// 状态页签按枚举值升序（0-待确认 排在最前）
const statusTabs: { key: number | ''; label: string }[] = [
  { key: '', label: '全部订单' },
  ...Object.entries(ORDER_STATUS_LABEL)
    .map(([key, label]) => ({ key: Number(key), label }))
    .sort((a, b) => a.key - b.key)
]

// 订单列表：失败即报错，不回退演示数据
const pageRes = useFetch(() => orderApi.listOrders(query))

const orders = computed(() => pageRes.data?.list || [])
const total = computed(() => pageRes.data?.total || 0)

watch(() => [query.status, query.page], () => {
  pageRes.load()
})

function search() {
  query.page = 1
  pageRes.load()
}

function setStatus(key: number | '') {
  query.status = key
  query.page = 1
}

function goPage(p: number) {
  query.page = p
}

const pillClass = (s: number) => {
  const t = orderTone(s)
  return { orange: 'status-pending', mint: 'status-ok', lav: 'status-info', red: 'status-error', gray: 'status-disabled' }[t]
}

const payTone: Record<number, string> = {
  [PAYMENT_STATUS.PENDING]: 'status-pending',
  [PAYMENT_STATUS.CONFIRMED]: 'status-ok',
  [PAYMENT_STATUS.UNPAID]: 'status-disabled',
  [PAYMENT_STATUS.REFUNDED]: 'status-error'
}

const payTypeLabel: Record<string, string> = { deposit: '定金', final: '尾款', addon: '加片' }

// ── 订单详情（后端返回包裹结构：order/payments/refunds/logs/delivery）──
const detail = ref<Order | null>(null)
const detailPayments = ref<Payment[]>([])
const detailRefunds = ref<Refund[]>([])
const detailLogs = ref<OrderLog[]>([])
const detailOpen = ref(false)
const loadingDetail = ref(false)
const detailError = ref('')

async function openDetail(o: Order) {
  detailOpen.value = true
  detail.value = null
  detailPayments.value = []
  detailRefunds.value = []
  detailLogs.value = []
  detailError.value = ''
  loadingDetail.value = true
  try {
    const res = await orderApi.orderDetail(o.id)
    detail.value = res.order
    detailPayments.value = res.payments || []
    detailRefunds.value = res.refunds || []
    detailLogs.value = res.logs || []
  } catch (e) {
    detailError.value = e instanceof Error ? e.message : '订单详情加载失败'
  } finally {
    loadingDetail.value = false
  }
}

// ── 待确认订单 → 确认预约（0-待确认 → 1-待定金，后端状态机允许）──
const confirmingID = ref<number | null>(null)

async function confirmOrder(o: Order) {
  confirmingID.value = o.id
  try {
    await orderApi.updateOrderStatus(o.id, ORDER_STATUS.PENDING_DEPOSIT)
    toastOk('已确认预约，订单进入待定金')
    await pageRes.load()
    if (detailOpen.value && detail.value?.id === o.id) {
      await openDetail({ ...detail.value, status: ORDER_STATUS.PENDING_DEPOSIT })
    }
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '确认失败')
  } finally {
    confirmingID.value = null
  }
}

// ── 新建订单（客户/套餐下拉走真实接口，不再使用演示数据）──
const createOpen = ref(false)
const saving = ref(false)
const optionsLoading = ref(false)
const customerOptions = ref<Customer[]>([])
const packageOptions = ref<Package[]>([])

const form = reactive({
  customer_id: 0 as number,
  package_id: 0 as number,
  shoot_date: '',
  shoot_time: '',
  shoot_address: '',
  photographer_id: undefined as number | undefined,
  addon_amount: 0,
  remark: ''
})

async function loadOptions() {
  optionsLoading.value = true
  try {
    const [cs, ps] = await Promise.all([
      customerApi.listCustomers({ page: 1, page_size: 200 }),
      packageApi.listPackages({ page: 1, page_size: 200, status: PACKAGE_STATUS.ACTIVE })
    ])
    customerOptions.value = cs.list || []
    packageOptions.value = ps.list || []
    if (!customerOptions.value.length) toastErr('暂无客户，请先在客户管理中建档')
    if (!packageOptions.value.length) toastErr('暂无已上架套餐，请先在套餐管理中上架')
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '客户/套餐加载失败')
  } finally {
    optionsLoading.value = false
  }
}

function openCreate() {
  createOpen.value = true
  if (!customerOptions.value.length || !packageOptions.value.length) {
    void loadOptions()
  }
}

async function saveOrder() {
  if (!form.customer_id) {
    toastErr('请选择客户')
    return
  }
  if (!form.package_id) {
    toastErr('请选择套餐')
    return
  }
  saving.value = true
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
    createOpen.value = false
    form.customer_id = 0
    form.package_id = 0
    form.shoot_date = ''
    form.shoot_time = ''
    form.shoot_address = ''
    form.addon_amount = 0
    form.remark = ''
    await pageRes.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '创建失败')
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
        <button class="btn btn-primary" @click="openCreate">+ 新建订单</button>
      </div>
    </div>

    <div v-if="pageRes.error" class="data-source-tip error">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      订单加载失败：{{ pageRes.error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="pageRes.load()">重试</button>
    </div>

    <div class="tabs">
      <button
        v-for="s in statusTabs"
        :key="s.key"
        class="tab"
        :class="{ active: query.status === s.key }"
        @click="setStatus(s.key)"
      >
        {{ s.label }}{{ s.key === '' ? ` · ${total}` : '' }}
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
              <th style="width: 150px"></th>
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
                <div class="flex gap-6">
                  <button
                    v-if="o.status === ORDER_STATUS.PENDING_CONFIRM"
                    class="btn btn-sm btn-primary"
                    :disabled="confirmingID === o.id"
                    @click="confirmOrder(o)"
                  >
                    {{ confirmingID === o.id ? '确认中' : '确认预约' }}
                  </button>
                  <button class="btn btn-sm btn-outline" @click="openDetail(o)">详情</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!orders.length && !pageRes.loading" class="empty-state">
        <strong>{{ pageRes.error ? '加载失败' : '暂无订单' }}</strong>
        <p>{{ pageRes.error ? pageRes.error : '调整筛选条件或新建一笔订单。' }}</p>
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
        <h3>订单详情 · {{ detail?.code || '' }}</h3>
        <button class="modal-close" style="margin-left: auto" @click="detailOpen = false">
          <svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="drawer-body" v-if="detailError" style="display: grid; place-items: center; color: var(--muted); text-align: center">
        <div>
          <strong>详情加载失败</strong>
          <p class="xsmall mt-8">{{ detailError }}</p>
        </div>
      </div>

      <div class="drawer-body" v-else-if="detail">
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
          <div class="field"><span class="field-label">已收 / 已退</span><span>{{ money(detail.paid_amt) }} / {{ money(detail.refund_amt) }}</span></div>
          <div class="field"><span class="field-label">加片金额</span><span>{{ money(detail.addon_amount) }}</span></div>
        </div>

        <div class="divider"></div>
        <div class="section-title" style="margin-top: 0"><h2>收款记录</h2><span>{{ detailPayments.length }} 笔</span></div>
        <div v-if="detailPayments.length" class="pay-list">
          <div v-for="p in detailPayments" :key="p.id" class="pay-row">
            <span class="pill" :class="payTone[p.status] || 'status-disabled'">{{ PAYMENT_STATUS_LABEL[p.status] || p.status }}</span>
            <span class="cell-main">{{ payTypeLabel[p.type] || p.type }}</span>
            <span class="cell-sub">{{ formatDateTime(p.paid_at) || '—' }}</span>
            <span class="strong" style="margin-left: auto">{{ money(p.amount) }}</span>
          </div>
        </div>
        <div v-else class="empty-state"><strong>暂无收款记录</strong></div>

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
        <button
          v-if="detail && detail.status === ORDER_STATUS.PENDING_CONFIRM"
          class="btn btn-primary"
          :disabled="confirmingID === detail.id"
          @click="confirmOrder(detail)"
        >
          {{ confirmingID === detail.id ? '确认中…' : '确认预约' }}
        </button>
        <button class="btn btn-ghost" style="margin-left: auto" @click="detailOpen = false">关闭</button>
      </div>
    </div>

    <!-- 新建订单弹窗 -->
    <BaseModal :open="createOpen" title="新建订单" @close="createOpen = false">
      <form id="modal-form" class="form-grid form-grid-2" @submit.prevent="saveOrder">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 客户</label>
          <select v-model.number="form.customer_id" class="select" :disabled="optionsLoading">
            <option :value="0" disabled>{{ optionsLoading ? '加载中…' : '请选择客户' }}</option>
            <option v-for="c in customerOptions" :key="c.id" :value="c.id">
              {{ c.name }}{{ c.mobile ? `（${c.mobile}）` : '' }}
            </option>
          </select>
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 套餐</label>
          <select v-model.number="form.package_id" class="select" :disabled="optionsLoading">
            <option :value="0" disabled>{{ optionsLoading ? '加载中…' : '请选择套餐' }}</option>
            <option v-for="p in packageOptions" :key="p.id" :value="p.id">{{ p.name }}（{{ money(p.base_price) }}）</option>
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
      <template #foot>
        <button class="btn btn-ghost" @click="createOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="modal-form" :disabled="saving">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </template>
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

.pay-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 2px;
}

.pay-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12px;
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

.data-source-tip.error {
  color: var(--red, #c0392b);
}
</style>
