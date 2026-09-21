<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as orderApi from '@/api/orders'
import * as customerApi from '@/api/customers'
import * as packageApi from '@/api/packages'
import * as deliveryApi from '@/api/delivery'
import { useFetch } from '@/composables/useFetch'
import { money, formatDate, formatDateTime, initials, orderTone } from '@/utils/format'
import { ORDER_STATUS, ORDER_STATUS_LABEL, ORDER_SOURCE_LABEL, PAYMENT_STATUS, PAYMENT_STATUS_LABEL, PACKAGE_STATUS, RESCHEDULE_STATUS, RESCHEDULE_STATUS_LABEL, RESCHEDULE_FEE_TYPE_LABEL, DELIVERY_STAGE_LABEL } from '@/constants/enums'
import type {
  Order,
  OrderLog,
  Payment,
  Refund,
  Customer,
  Package,
  OrderAddon,
  OrderReschedule,
  Delivery,
  DeliveryItem
} from '@/types'

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

/** 加项分类（后端存字符串） */
const ADDON_CATEGORY_LABEL: Record<string, string> = {
  makeup: '妆造',
  urgency: '时效',
  service: '服务',
  retouch: '精修'
}

const ADDON_CATEGORY_OPTIONS = Object.entries(ADDON_CATEGORY_LABEL).map(([value, label]) => ({ value, label }))

// ── 订单详情（后端返回包裹结构：order/payments/refunds/logs/delivery + allowed_transitions）──
type DetailTab = 'overview' | 'payments' | 'addons' | 'reschedule' | 'files' | 'logs'

const detail = ref<Order | null>(null)
const detailPayments = ref<Payment[]>([])
const detailRefunds = ref<Refund[]>([])
const detailLogs = ref<OrderLog[]>([])
const detailAddons = ref<OrderAddon[]>([])
const detailReschedules = ref<OrderReschedule[]>([])
const detailItems = ref<DeliveryItem[]>([])
const detailDelivery = ref<Delivery | null>(null)
const detailAllowed = ref<number[]>([])
const detailTab = ref<DetailTab>('overview')
const detailOpen = ref(false)
const loadingDetail = ref(false)
const detailError = ref('')

const detailTabs = computed(
  () =>
    [
      { key: 'overview', label: '概览', count: undefined },
      { key: 'payments', label: '收款', count: detailPayments.value.length + detailRefunds.value.length },
      { key: 'addons', label: '加项', count: detailAddons.value.length },
      { key: 'reschedule', label: '改期', count: detailReschedules.value.length },
      { key: 'files', label: '文件', count: detailItems.value.length },
      { key: 'logs', label: '动态', count: detailLogs.value.length }
    ] as { key: DetailTab; label: string; count?: number }[]
)

// 收款双口径：申报金额 vs 已确认到账。
// 待核验的申报**不计入已收**，但已包含在订单应收内（原型财务口径）。
const paymentSummary = computed(() => {
  let declared = 0
  let confirmed = 0
  let pending = 0
  for (const p of detailPayments.value) {
    const amt = p.amount || 0
    declared += amt
    if (p.status === PAYMENT_STATUS.CONFIRMED) confirmed += amt
    else if (p.status === PAYMENT_STATUS.PENDING) pending += amt
  }
  return { declared, confirmed, pending }
})

async function openDetail(orderId: number) {
  detailOpen.value = true
  detail.value = null
  detailPayments.value = []
  detailRefunds.value = []
  detailLogs.value = []
  detailAddons.value = []
  detailReschedules.value = []
  detailItems.value = []
  detailDelivery.value = null
  detailAllowed.value = []
  detailTab.value = 'overview'
  detailError.value = ''
  loadingDetail.value = true
  try {
    const res = await orderApi.orderDetail(orderId)
    detail.value = res.order
    detailPayments.value = res.payments || []
    detailRefunds.value = res.refunds || []
    detailLogs.value = res.logs || []
    detailDelivery.value = res.delivery
    detailAllowed.value = res.allowed_transitions || []
    // 关联集合并发补全：任一失败只影响对应 tab，不阻断主详情
    void loadSubCollections(orderId)
  } catch (e) {
    detailError.value = e instanceof Error ? e.message : '订单详情加载失败'
  } finally {
    loadingDetail.value = false
  }
}

async function loadSubCollections(orderId: number) {
  const [addons, reschedules, items] = await Promise.allSettled([
    orderApi.listAddons(orderId),
    orderApi.listReschedules(orderId),
    deliveryApi.deliveryItems(orderId)
  ])
  if (addons.status === 'fulfilled') detailAddons.value = addons.value || []
  if (reschedules.status === 'fulfilled') detailReschedules.value = reschedules.value || []
  if (items.status === 'fulfilled') detailItems.value = items.value || []
}

/** 刷新详情并保持当前 tab（增项/改期/推进后调用） */
async function refreshDetail(keepTab = true) {
  if (!detail.value) return
  const id = detail.value.id
  const tab = detailTab.value
  await openDetail(id)
  if (keepTab) detailTab.value = tab
}

// ── 阶段推进（allowed_transitions 由后端领域状态机给出，前端不重复实现规则）──
const advancing = ref(false)

const ADVANCE_LABEL: Record<number, string> = {
  [ORDER_STATUS.PENDING_DEPOSIT]: '确认预约',
  [ORDER_STATUS.PENDING_SHOOT]: '进入待拍摄',
  [ORDER_STATUS.SHOOTING]: '开始拍摄',
  [ORDER_STATUS.RETOUCHING]: '进入精修',
  [ORDER_STATUS.PENDING_DELIVERY]: '提交交付',
  [ORDER_STATUS.COMPLETED]: '完成归档'
}

/** 取消单独处理（需填原因），不放进阶段推进按钮组 */
const advanceTargets = computed(() => detailAllowed.value.filter((s) => s !== ORDER_STATUS.CANCELLED))
const canCancel = computed(() => detailAllowed.value.includes(ORDER_STATUS.CANCELLED))

async function advanceTo(target: number) {
  if (!detail.value) return
  const id = detail.value.id
  advancing.value = true
  try {
    await orderApi.updateOrderStatus(id, target)
    toastOk(`订单已更新为「${ORDER_STATUS_LABEL[target] || target}」`)
    await pageRes.load()
    await refreshDetail()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '状态更新失败')
  } finally {
    advancing.value = false
  }
}

// ── 列表内「确认预约」快捷操作（0-待确认 → 1-待定金）──
const confirmingID = ref<number | null>(null)

async function confirmOrder(o: Order) {
  confirmingID.value = o.id
  try {
    await orderApi.updateOrderStatus(o.id, ORDER_STATUS.PENDING_DEPOSIT)
    toastOk('已确认预约，订单进入待定金')
    await pageRes.load()
    if (detailOpen.value && detail.value?.id === o.id) {
      await refreshDetail()
    }
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '确认失败')
  } finally {
    confirmingID.value = null
  }
}

// ── 取消订单 ──
const cancelOpen = ref(false)
const cancelReason = ref('')
const cancelSaving = ref(false)

function openCancel() {
  cancelReason.value = ''
  cancelOpen.value = true
}

async function submitCancel() {
  if (!detail.value) return
  if (!cancelReason.value.trim()) {
    toastErr('请填写取消原因')
    return
  }
  cancelSaving.value = true
  try {
    await orderApi.cancelOrder(detail.value.id, cancelReason.value.trim())
    toastOk('订单已取消')
    cancelOpen.value = false
    await pageRes.load()
    await refreshDetail()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '取消失败')
  } finally {
    cancelSaving.value = false
  }
}

// ── 加项（增删改后端同事务重算订单金额，前端不做本地累加）──
const addonOpen = ref(false)
const addonSaving = ref(false)
const addonEditingID = ref<number | null>(null)
const addonForm = reactive({ name: '', category: 'makeup', price: 0, qty: 1, confirmed: 0, remark: '' })

function openAddonCreate() {
  addonEditingID.value = null
  addonForm.name = ''
  addonForm.category = 'makeup'
  addonForm.price = 0
  addonForm.qty = 1
  addonForm.confirmed = 0
  addonForm.remark = ''
  addonOpen.value = true
}

function openAddonEdit(a: OrderAddon) {
  addonEditingID.value = a.id
  addonForm.name = a.name
  addonForm.category = a.category || 'makeup'
  addonForm.price = a.price
  addonForm.qty = a.qty
  addonForm.confirmed = a.confirmed
  addonForm.remark = a.remark
  addonOpen.value = true
}

async function saveAddon() {
  if (!detail.value) return
  if (!addonForm.name.trim()) {
    toastErr('请填写加项名称')
    return
  }
  const payload = {
    name: addonForm.name.trim(),
    category: addonForm.category,
    price: Number(addonForm.price) || 0,
    qty: Number(addonForm.qty) || 1,
    confirmed: addonForm.confirmed,
    remark: addonForm.remark
  }
  addonSaving.value = true
  try {
    if (addonEditingID.value) {
      await orderApi.updateAddon(addonEditingID.value, payload)
    } else {
      await orderApi.createAddon(detail.value.id, payload)
    }
    toastOk('已保存，订单金额已重算')
    addonOpen.value = false
    await refreshDetail()
    await pageRes.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '保存失败')
  } finally {
    addonSaving.value = false
  }
}

async function removeAddon(a: OrderAddon) {
  if (!window.confirm(`确认删除加项「${a.name}」？订单金额将同步重算。`)) return
  try {
    await orderApi.deleteAddon(a.id)
    toastOk('已删除，订单金额已重算')
    await refreshDetail()
    await pageRes.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '删除失败')
  }
}

// ── 改期（PC 走改期单链路，不直接改订单拍摄日期）──
const rescheduleOpen = ref(false)
const rescheduleSaving = ref(false)
const rescheduleForm = reactive({ new_date: '', new_time: '', reason_label: '', reason: '' })

function openReschedule() {
  rescheduleForm.new_date = ''
  rescheduleForm.new_time = ''
  rescheduleForm.reason_label = ''
  rescheduleForm.reason = ''
  rescheduleOpen.value = true
}

async function saveReschedule() {
  if (!detail.value) return
  if (!rescheduleForm.new_date || !rescheduleForm.new_time.trim()) {
    toastErr('请选择新的拍摄日期与时段')
    return
  }
  rescheduleSaving.value = true
  try {
    await orderApi.applyReschedule(detail.value.id, {
      new_date: rescheduleForm.new_date,
      new_time: rescheduleForm.new_time.trim(),
      reason_label: rescheduleForm.reason_label || undefined,
      reason: rescheduleForm.reason || undefined
    })
    toastOk('改期申请已提交')
    rescheduleOpen.value = false
    await refreshDetail()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '改期申请失败')
  } finally {
    rescheduleSaving.value = false
  }
}

const auditingID = ref<number | null>(null)

async function auditReschedule(r: OrderReschedule, approved: boolean) {
  const tip = approved ? '确认同意该改期申请？' : '确认驳回该改期申请？'
  if (!window.confirm(tip)) return
  auditingID.value = r.id
  try {
    await orderApi.auditReschedule(r.id, approved)
    toastOk(approved ? '已同意改期' : '已驳回改期')
    await refreshDetail()
    await pageRes.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '审批失败')
  } finally {
    auditingID.value = null
  }
}

const rescheduleTone = (s: number) => {
  if (s === RESCHEDULE_STATUS.PENDING) return 'status-pending'
  if (s === RESCHEDULE_STATUS.APPROVED) return 'status-ok'
  if (s === RESCHEDULE_STATUS.REJECTED) return 'status-error'
  return 'status-disabled'
}

/** 文件大小（字节 → 人类可读） */
function humanSize(n: number) {
  if (!n || n <= 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** 交付明细用途标签（biz_delivery_item.kind，tinyint：1-样片 2-已选 3-精修成品） */
const fileKindLabel: Record<number, string> = { 1: '样片', 2: '已选', 3: '精修成品' }

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
        <button v-perm="'order:create'" class="btn btn-primary" @click="openCreate">+ 新建订单</button>
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
                    v-perm="'order:status'"
                    class="btn btn-sm btn-primary"
                    :disabled="confirmingID === o.id"
                    @click="confirmOrder(o)"
                  >
                    {{ confirmingID === o.id ? '确认中' : '确认预约' }}
                  </button>
                  <button class="btn btn-sm btn-outline" @click="openDetail(o.id)">详情</button>
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

      <template v-else-if="detail">
        <div class="drawer-body">
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

          <div class="detail-tabs">
            <button
              v-for="t in detailTabs"
              :key="t.key"
              class="detail-tab"
              :class="{ active: detailTab === t.key }"
              @click="detailTab = t.key"
            >
              {{ t.label }}<span v-if="t.count !== undefined" class="detail-tab-count">{{ t.count }}</span>
            </button>
          </div>

          <!-- 概览 -->
          <div v-show="detailTab === 'overview'">
            <div class="detail-grid">
              <div class="field"><span class="field-label">订单号</span><span>{{ detail.code }}</span></div>
              <div class="field"><span class="field-label">联系电话</span><span>{{ detail.customer_mobile || '—' }}</span></div>
              <div class="field"><span class="field-label">拍摄日期</span><span>{{ formatDate(detail.shoot_date) }} {{ detail.shoot_time }}</span></div>
              <div class="field"><span class="field-label">拍摄地点</span><span>{{ detail.shoot_address || '—' }}</span></div>
              <div class="field"><span class="field-label">主拍摄影师</span><span>{{ detail.photographer || '未分配' }}</span></div>
              <div class="field"><span class="field-label">订单来源</span><span>{{ ORDER_SOURCE_LABEL[detail.source_type] || '—' }}</span></div>
              <div class="field"><span class="field-label">套餐版本</span><span>v{{ detail.package_version }}</span></div>
              <div class="field"><span class="field-label">套餐基础价</span><span>{{ money(detail.base_price) }}</span></div>
              <div class="field"><span class="field-label">加项合计</span><span>{{ money(detail.addon_amount) }}</span></div>
              <div class="field"><span class="field-label">定金</span><span>{{ money(detail.deposit_amt) }}</span></div>
              <div class="field"><span class="field-label">尾款</span><span>{{ money(detail.final_amt) }}</span></div>
              <div class="field"><span class="field-label">已收 / 已退</span><span>{{ money(detail.paid_amt) }} / {{ money(detail.refund_amt) }}</span></div>
              <div class="field"><span class="field-label">交付阶段</span><span>{{ detailDelivery ? DELIVERY_STAGE_LABEL[detailDelivery.stage] || '—' : '未创建交付单' }}</span></div>
            </div>
            <div class="field" style="margin-top: 4px">
              <span class="field-label">备注</span>
              <span>{{ detail.remark || '—' }}</span>
            </div>
          </div>

          <!-- 收款 / 退款 -->
          <div v-show="detailTab === 'payments'">
            <div class="section-title" style="margin-top: 0"><h2>收款记录</h2><span>{{ detailPayments.length }} 笔</span></div>
            <div class="pay-summary">
              <div><span class="muted xsmall">申报合计</span><b>{{ money(paymentSummary.declared) }}</b></div>
              <div><span class="muted xsmall">已确认到账</span><b class="ok">{{ money(paymentSummary.confirmed) }}</b></div>
              <div><span class="muted xsmall">待核验申报</span><b class="warn">{{ money(paymentSummary.pending) }}</b></div>
            </div>
            <div v-if="detailPayments.length" class="pay-list">
              <div v-for="p in detailPayments" :key="p.id" class="pay-row">
                <span class="pill" :class="payTone[p.status] || 'status-disabled'">{{ PAYMENT_STATUS_LABEL[p.status] || p.status }}</span>
                <span class="cell-main">{{ payTypeLabel[p.type] || p.type }}</span>
                <span class="cell-sub">{{ formatDateTime(p.paid_at) || '—' }}</span>
                <span class="strong" style="margin-left: auto">{{ money(p.amount) }}</span>
              </div>
            </div>
            <div v-else class="empty-state"><strong>暂无收款记录</strong></div>

            <div class="section-title"><h2>退款记录</h2><span>{{ detailRefunds.length }} 笔</span></div>
            <div v-if="detailRefunds.length" class="pay-list">
              <div v-for="r in detailRefunds" :key="r.id" class="pay-row">
                <span class="cell-main">{{ r.reason || '—' }}</span>
                <span class="cell-sub">{{ formatDateTime(r.refund_at) || '—' }}</span>
                <span class="strong" style="margin-left: auto">{{ money(r.amount) }}</span>
              </div>
            </div>
            <div v-else class="empty-state"><strong>暂无退款记录</strong></div>
          </div>

          <!-- 加项 -->
          <div v-show="detailTab === 'addons'">
            <div class="section-title" style="margin-top: 0">
              <h2>加项明细</h2>
              <button v-perm="'order:update'" class="btn btn-sm btn-primary" @click="openAddonCreate">+ 新增加项</button>
            </div>
            <div v-if="detailAddons.length" class="pay-list">
              <div v-for="a in detailAddons" :key="a.id" class="pay-row">
                <span class="pill status-info">{{ ADDON_CATEGORY_LABEL[a.category] || a.category || '其他' }}</span>
                <span class="cell-main">{{ a.name }}</span>
                <span class="cell-sub">{{ money(a.price) }} × {{ a.qty }}</span>
                <span class="pill" :class="a.confirmed ? 'status-ok' : 'status-disabled'">{{ a.confirmed ? '客户已确认' : '待确认' }}</span>
                <span class="strong">{{ money(a.amount) }}</span>
                <div class="flex gap-6" style="margin-left: auto">
                  <button v-perm="'order:update'" class="btn btn-sm btn-outline" @click="openAddonEdit(a)">编辑</button>
                  <button v-perm="'order:update'" class="btn btn-sm btn-ghost" @click="removeAddon(a)">删除</button>
                </div>
              </div>
            </div>
            <div v-else class="empty-state"><strong>暂无加项</strong><p>加项金额会计入订单总额与尾款。</p></div>
            <div v-if="detailAddons.length" class="addon-total">
              加项合计 <span class="strong">{{ money(detail.addon_amount) }}</span>
            </div>
          </div>

          <!-- 改期 -->
          <div v-show="detailTab === 'reschedule'">
            <div class="section-title" style="margin-top: 0">
              <h2>改期记录</h2>
              <button v-perm="'order:reschedule'" class="btn btn-sm btn-primary" @click="openReschedule">+ 发起改期</button>
            </div>
            <div v-if="detailReschedules.length" class="pay-list">
              <div v-for="r in detailReschedules" :key="r.id" class="rs-card">
                <div class="flex gap-6" style="align-items: center">
                  <span class="cell-main">{{ r.original_date }} {{ r.original_time || '' }}</span>
                  <span class="muted">→</span>
                  <span class="cell-main strong">{{ r.new_date }} {{ r.new_time }}</span>
                  <span class="pill" :class="rescheduleTone(r.status)">{{ RESCHEDULE_STATUS_LABEL[r.status] || r.status }}</span>
                  <span class="pill status-disabled">{{ RESCHEDULE_FEE_TYPE_LABEL[r.fee_type] || '—' }}</span>
                  <span v-if="r.fee_amount > 0" class="cell-sub">调度费 {{ money(r.fee_amount) }}</span>
                </div>
                <div class="cell-sub mt-8">
                  {{ r.reason_label || '未分类' }}{{ r.reason ? ` · ${r.reason}` : '' }} ·
                  {{ r.apply_source === 1 ? '管理端发起' : '客户申请' }}
                </div>
                <div v-if="r.audit_name" class="cell-sub mt-8">审批：{{ r.audit_name }}{{ r.audit_remark ? ` · ${r.audit_remark}` : '' }}</div>
                <div v-if="r.status === RESCHEDULE_STATUS.PENDING" v-perm="'order:reschedule_audit'" class="flex gap-6 mt-8">
                  <button class="btn btn-sm btn-primary" :disabled="auditingID === r.id" @click="auditReschedule(r, true)">同意</button>
                  <button class="btn btn-sm btn-outline" :disabled="auditingID === r.id" @click="auditReschedule(r, false)">驳回</button>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <strong>暂无改期记录</strong>
              <p>改期会同步重排档期锁，不要直接修改订单拍摄日期。</p>
            </div>
          </div>

          <!-- 文件 -->
          <div v-show="detailTab === 'files'">
            <div class="section-title" style="margin-top: 0"><h2>交付文件</h2><span>{{ detailItems.length }} 个</span></div>
            <div v-if="detailItems.length" class="file-list">
              <a v-for="f in detailItems" :key="f.id" class="file-row" :href="f.url" target="_blank" rel="noopener">
                <span class="pill status-info">{{ fileKindLabel[f.kind] || f.kind || '文件' }}</span>
                <span class="cell-main">{{ f.filename || f.url }}</span>
                <span class="cell-sub">{{ humanSize(f.size) }}</span>
                <span v-if="f.is_selected" class="pill status-ok">已选</span>
                <span v-if="f.feedback_status === 1" class="pill status-pending">待处理反馈</span>
              </a>
            </div>
            <div v-else class="empty-state">
              <strong>暂无交付文件</strong>
              <p>交付单尚未创建或未上传文件。</p>
            </div>
          </div>

          <!-- 动态 -->
          <div v-show="detailTab === 'logs'">
            <div class="section-title" style="margin-top: 0"><h2>动态时间线</h2></div>
            <div v-if="detailLogs.length" class="timeline">
              <div v-for="log in detailLogs" :key="log.id" class="tl-item">
                <span class="tl-dot"></span>
                <div>
                  <div class="tl-content">{{ log.content }}</div>
                  <div class="tl-meta">{{ log.operator_name }}{{ log.created_at ? ` · ${formatDateTime(log.created_at)}` : '' }}</div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state"><strong>暂无动态</strong></div>
          </div>
        </div>
      </template>

      <div class="drawer-body" v-else style="display: grid; place-items: center; color: var(--muted)">
        <span class="icon spin"><svg class="icon" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9" /></svg></span>
      </div>

      <div class="drawer-foot drawer-foot-wrap">
        <template v-if="detail">
          <button
            v-for="s in advanceTargets"
            :key="s"
            v-perm="'order:status'"
            class="btn btn-sm btn-primary"
            :disabled="advancing"
            @click="advanceTo(s)"
          >
            {{ ADVANCE_LABEL[s] || ORDER_STATUS_LABEL[s] }}
          </button>
          <button v-if="canCancel" v-perm="'order:cancel'" class="btn btn-sm btn-ghost" :disabled="advancing" @click="openCancel">取消订单</button>
        </template>
        <button class="btn btn-ghost" style="margin-left: auto" @click="detailOpen = false">关闭</button>
      </div>
    </div>

    <!-- 加项弹窗 -->
    <BaseModal :open="addonOpen" :title="addonEditingID ? '编辑加项' : '新增加项'" @close="addonOpen = false">
      <form id="addon-form" class="form-grid form-grid-2" @submit.prevent="saveAddon">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 名称</label>
          <input v-model="addonForm.name" class="input" placeholder="如 加拍 1 小时" />
        </div>
        <div class="field">
          <label class="field-label">分类</label>
          <select v-model="addonForm.category" class="select">
            <option v-for="c in ADDON_CATEGORY_OPTIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">单价（元）</label>
          <input v-model.number="addonForm.price" class="input" type="number" min="0" step="0.01" />
        </div>
        <div class="field">
          <label class="field-label">数量</label>
          <input v-model.number="addonForm.qty" class="input" type="number" min="1" />
        </div>
        <div class="field">
          <label class="field-label">客户确认</label>
          <select v-model.number="addonForm.confirmed" class="select">
            <option :value="0">待确认</option>
            <option :value="1">已确认</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">小计</label>
          <span class="strong" style="padding-top: 6px">{{ money((Number(addonForm.price) || 0) * (Number(addonForm.qty) || 0)) }}</span>
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">备注</label>
          <textarea v-model="addonForm.remark" class="input" rows="2" placeholder="可选"></textarea>
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="addonOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="addon-form" :disabled="addonSaving">
          {{ addonSaving ? '保存中…' : '保存' }}
        </button>
      </template>
    </BaseModal>

    <!-- 改期申请弹窗 -->
    <BaseModal :open="rescheduleOpen" title="发起改期" @close="rescheduleOpen = false">
      <form id="reschedule-form" class="form-grid form-grid-2" @submit.prevent="saveReschedule">
        <div class="field">
          <label class="field-label">当前档期</label>
          <span style="padding-top: 6px">{{ detail ? `${formatDate(detail.shoot_date)} ${detail.shoot_time || ''}` : '—' }}</span>
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 新拍摄日期</label>
          <input v-model="rescheduleForm.new_date" class="input" type="date" />
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 新时段</label>
          <input v-model="rescheduleForm.new_time" class="input" placeholder="如 10:00-12:30" />
        </div>
        <div class="field">
          <label class="field-label">原因分类</label>
          <input v-model="rescheduleForm.reason_label" class="input" placeholder="如 客户临时有事" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">原因说明</label>
          <textarea v-model="rescheduleForm.reason" class="input" rows="2" placeholder="可选"></textarea>
        </div>
        <p class="xsmall muted" style="grid-column: 1 / -1">
          改期提交后需审批；审批通过才会重排档期锁并更新订单拍摄日期。
        </p>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="rescheduleOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="reschedule-form" :disabled="rescheduleSaving">
          {{ rescheduleSaving ? '提交中…' : '提交申请' }}
        </button>
      </template>
    </BaseModal>

    <!-- 取消订单弹窗 -->
    <BaseModal :open="cancelOpen" title="取消订单" @close="cancelOpen = false">
      <form id="cancel-form" class="form-grid" @submit.prevent="submitCancel">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 取消原因</label>
          <textarea v-model="cancelReason" class="input" rows="3" placeholder="请填写取消原因，将记入订单动态"></textarea>
        </div>
        <p class="xsmall muted">订单取消后不可恢复，如需退款请单独发起退款申请。</p>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="cancelOpen = false">返回</button>
        <button class="btn btn-primary" type="submit" form="cancel-form" :disabled="cancelSaving">
          {{ cancelSaving ? '提交中…' : '确认取消' }}
        </button>
      </template>
    </BaseModal>

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

.detail-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 14px 0 6px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 14px;
}

.detail-tab {
  border: none;
  background: transparent;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
}

.detail-tab:hover {
  background: var(--line);
}

.detail-tab.active {
  background: var(--orange);
  color: var(--white);
}

.detail-tab-count {
  margin-left: 5px;
  opacity: 0.75;
}

.pay-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 2px;
}

.pay-summary {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  background: #fbfaf6;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 12px;
}

.pay-summary > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pay-summary b {
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
}

.pay-summary b.ok {
  color: var(--green-dark, #2f7d5a);
}

.pay-summary b.warn {
  color: var(--orange-dark);
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

.rs-card {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0 2px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12px;
  color: inherit;
  text-decoration: none;
}

.file-row:hover {
  border-color: var(--orange);
}

.addon-total {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 10px;
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

.drawer-foot-wrap {
  flex-wrap: wrap;
  gap: 8px;
}
</style>
