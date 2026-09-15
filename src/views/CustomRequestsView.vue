<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import BaseModal from '@/components/BaseModal.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import { useFetch } from '@/composables/useFetch'
import * as crApi from '@/api/customRequests'
import { listPackages } from '@/api/packages'
import { listUsers } from '@/api/members'
import { formatDateTime, formatDate, initials, money } from '@/utils/format'
import { CUSTOM_REQUEST_STATUS, CUSTOM_REQUEST_STATUS_LABEL, PACKAGE_STATUS } from '@/types'
import type { CustomRequest, Package } from '@/types'

const router = useRouter()

/* ── 列表 ─────────────────────────────────────── */
// 数据来自 H5「定制需求」表单（biz_custom_request）。筛选/分页参数走 POST body。
// photographer_id：按「客户指定的摄影师」筛选，0 = 不过滤（2026-09-15 起后端支持）。
const query = reactive({ status: '' as number | '', photographer_id: 0, page: 1, page_size: 20 })

const page = useFetch(() => crApi.listCustomRequests({ ...query }))
const list = computed(() => page.data?.list || [])
const total = computed(() => page.data?.total || 0)

// 状态页签按枚举值升序（1-待处理 在最前）
const statusTabs: { key: number | ''; label: string }[] = [
  { key: '', label: '全部' },
  ...Object.entries(CUSTOM_REQUEST_STATUS_LABEL)
    .map(([key, label]) => ({ key: Number(key), label }))
    .sort((a, b) => a.key - b.key)
]

watch(
  () => [query.status, query.photographer_id, query.page],
  () => page.load()
)

function setStatus(key: number | '') {
  query.status = key
  query.page = 1
}

/* ── 摄影师筛选 ───────────────────────────────── */
// 选项来自员工列表（一次拉取，量级很小）。无 user:view 权限时该接口会 403 —— 捕获后留空，
// 只影响这一个下拉，不影响列表本身（筛选项本来也可以由别处带进来）。
const staffOptions = ref<{ id: number; name: string }[]>([])

async function loadStaffOptions() {
  try {
    const res = await listUsers({ page: 1, page_size: 200 })
    staffOptions.value = (res.list || []).map((u) => ({ id: u.id, name: u.nickname || u.username }))
  } catch {
    staffOptions.value = []
  }
}
loadStaffOptions()

/** 切换摄影师筛选（与 setStatus 同节奏：改条件即回到第一页） */
function setPhotographer(e: Event) {
  query.photographer_id = Number((e.target as HTMLSelectElement).value) || 0
  query.page = 1
}

const STATUS_CLASS: Record<number, string> = {
  [CUSTOM_REQUEST_STATUS.PENDING]: 'status-pending',
  [CUSTOM_REQUEST_STATUS.RESPONDED]: 'status-ok',
  [CUSTOM_REQUEST_STATUS.CLOSED]: 'status-disabled'
}

/** 预算展示：0/0 = 未填；仅 min 有值 = 不封顶（H5 末档「¥5,000以上」的语义） */
function budgetText(r: CustomRequest) {
  const min = Number(r.budget_min) || 0
  const max = Number(r.budget_max) || 0
  if (!min && !max) return '未填'
  if (min && !max) return `${money(min)} 以上`
  if (!min && max) return `${money(max)} 以内`
  return `${money(min)} - ${money(max)}`
}

/** 参考图原始片段（可能含设备本地临时路径 —— H5 上传链路仍是 TODO） */
function imageParts(r: CustomRequest) {
  return String(r.images || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 仅渲染看起来可访问的 URL，本地临时路径降级为文本，避免整片碎图 */
function imageUrls(r: CustomRequest) {
  return imageParts(r).filter((s) => /^https?:\/\//i.test(s) || s.startsWith('/'))
}

/* ── 详情抽屉 ─────────────────────────────────── */
const detailOpen = ref(false)
const current = ref<CustomRequest | null>(null)

function openDetail(r: CustomRequest) {
  current.value = r
  detailOpen.value = true
}

/* ── 响应 ─────────────────────────────────────── */
const respondOpen = ref(false)
const respondBusy = ref(false)
const respondText = ref('')

function openRespond(r: CustomRequest) {
  current.value = r
  respondText.value = r.response || ''
  respondOpen.value = true
}

async function saveRespond() {
  const r = current.value
  if (!r) return
  const text = respondText.value.trim()
  if (!text) {
    toastErr('请填写响应说明')
    return
  }
  respondBusy.value = true
  try {
    await crApi.respondCustomRequest(r.id, text)
    respondOpen.value = false
    await page.load()
    toastOk('已响应')
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '响应失败')
  } finally {
    respondBusy.value = false
  }
}

/* ── 转订单 ───────────────────────────────────── */
// 定制需求不含套餐，转单必须先在后台选定套餐；且后端复用 CreateOrder 全流程
// （金额拆分 / 客户快照 / 档期占位），这里只负责收齐入参。
const convertOpen = ref(false)
const convertBusy = ref(false)
const packageOptions = ref<Package[]>([])
const convertForm = reactive({
  package_id: 0,
  shoot_date: '',
  shoot_time: '',
  shoot_address: '',
  addon_amount: 0,
  remark: ''
})

/** 需求里的期望日期是 H5 自由文本，只有形如 2026-10-01 的才回填进 <input type="date"> */
function normalizeDate(v: string) {
  const m = String(v || '').match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (!m) return ''
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

async function openConvert(r: CustomRequest) {
  current.value = r
  convertForm.package_id = 0
  convertForm.shoot_date = normalizeDate(r.expected_date)
  convertForm.shoot_time = ''
  convertForm.shoot_address = r.location || ''
  convertForm.addon_amount = 0
  convertForm.remark = ''
  if (!packageOptions.value.length) {
    try {
      // 只在售套餐（已上架）：草稿/已下线的套餐不该用来转单
      const res = await listPackages({ page: 1, page_size: 100, status: PACKAGE_STATUS.ACTIVE })
      packageOptions.value = res.list || []
    } catch {
      packageOptions.value = []
    }
  }
  convertOpen.value = true
}

const selectedPackage = computed(() => packageOptions.value.find((p) => p.id === convertForm.package_id) || null)

async function saveConvert() {
  const r = current.value
  if (!r) return
  if (!convertForm.package_id) {
    toastErr('请选择套餐')
    return
  }
  convertBusy.value = true
  try {
    const order = await crApi.convertCustomRequest(r.id, {
      package_id: convertForm.package_id,
      shoot_date: convertForm.shoot_date || undefined,
      shoot_time: convertForm.shoot_time.trim() || undefined,
      shoot_address: convertForm.shoot_address.trim() || undefined,
      addon_amount: Number(convertForm.addon_amount) || 0,
      remark: convertForm.remark.trim() || undefined
    })
    convertOpen.value = false
    detailOpen.value = false
    await page.load()
    toastOk(`已转为订单 ${order.code}`)
    // 直接跳到订单列表并按新订单号检索，省去用户手动找单
    router.push({ path: '/orders', query: { keyword: order.code } })
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '转订单失败')
  } finally {
    convertBusy.value = false
  }
}

const customerHint = computed(() => {
  const r = current.value
  if (!r) return ''
  return r.customer_id
    ? '已关联客户档案'
    : '未关联客户档案 · 转订单时按手机号自动查档/建档'
})
</script>

<template>
  <div>
    <AppToast />

    <div class="page-head">
      <div>
        <h1>定制需求</h1>
        <p>来自 H5 的定制诉求 · 共 {{ total }} 条，可响应或手动转为订单。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="page.load()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
      </div>
    </div>

    <div v-if="page.error" class="data-source-tip error">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      定制需求加载失败：{{ page.error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="page.load()">重试</button>
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

    <!-- 按「客户指定的摄影师」筛选：需求归属到人后，员工最关心「哪些是给我的」 -->
    <div class="cr-filter">
      <span class="xsmall muted">服务摄影师</span>
      <select class="select" :value="query.photographer_id" @change="setPhotographer">
        <option :value="0">全部</option>
        <option v-for="s in staffOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <span v-if="!staffOptions.length" class="xsmall muted">（无员工列表权限，暂无法按人筛选）</span>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>客户</th>
              <th>服务摄影师</th>
              <th>拍摄类型</th>
              <th>期望日期 / 地点</th>
              <th>预算</th>
              <th>状态</th>
              <th>提交时间</th>
              <th style="width: 190px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in list" :key="r.id">
              <td>
                <span class="cell-main">{{ r.name || '未填称呼' }}</span>
                <span class="cell-sub">{{ r.mobile || '未填手机号' }}</span>
              </td>
              <td>
                <span class="cell-main">{{ r.photographer || (r.photographer_id ? `#${r.photographer_id}` : '未指定') }}</span>
                <span v-if="!r.photographer_id" class="cell-sub">由工作室安排</span>
              </td>
              <td>
                <span class="cell-main">{{ r.project_type || '—' }}</span>
              </td>
              <td>
                <span class="cell-main">{{ r.expected_date || '待定' }}</span>
                <span class="cell-sub">{{ r.location || '地点待定' }}</span>
              </td>
              <td>
                <span class="cell-main">{{ budgetText(r) }}</span>
              </td>
              <td>
                <span class="pill" :class="STATUS_CLASS[r.status] || ''">
                  {{ CUSTOM_REQUEST_STATUS_LABEL[r.status] || r.status }}
                </span>
              </td>
              <td>
                <span class="cell-main">{{ formatDateTime(r.created_at) }}</span>
                <span v-if="r.response_at" class="cell-sub">响应 {{ formatDate(r.response_at) }}</span>
              </td>
              <td>
                <div class="flex gap-6">
                  <button class="btn btn-sm btn-outline" @click="openDetail(r)">详情</button>
                  <button
                    v-if="r.status === CUSTOM_REQUEST_STATUS.PENDING"
                    v-perm="'request:handle'"
                    class="btn btn-sm btn-outline"
                    @click="openRespond(r)"
                  >
                    响应
                  </button>
                  <button
                    v-if="r.status !== CUSTOM_REQUEST_STATUS.CLOSED"
                    v-perm="'request:handle'"
                    class="btn btn-sm btn-primary"
                    @click="openConvert(r)"
                  >
                    转订单
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!list.length && !page.loading" class="empty-state">
        <strong>{{ query.status === '' ? '暂无定制需求' : '该状态下暂无需求' }}</strong>
        <p>客户在 H5「定制需求」页提交后会出现在这里。</p>
      </div>
    </div>

    <div class="pager" v-if="total > query.page_size">
      <span>共 {{ total }} 条 · 第 {{ query.page }} 页</span>
      <div class="pager-pages">
        <button :disabled="query.page <= 1" @click="query.page--">上一页</button>
        <button :disabled="query.page * query.page_size >= total" @click="query.page++">下一页</button>
      </div>
    </div>

    <!-- 需求详情抽屉 -->
    <div v-if="detailOpen" class="drawer-backdrop" @click="detailOpen = false"></div>
    <div v-if="detailOpen" class="drawer">
      <div class="drawer-head">
        <h3>定制需求详情</h3>
        <button class="modal-close" style="margin-left: auto" @click="detailOpen = false">
          <svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="drawer-body" v-if="current">
        <div class="detail-hero">
          <div class="flex gap-10">
            <span class="avatar" style="width: 44px; height: 44px; font-size: 17px">{{ initials(current.name) }}</span>
            <div>
              <div class="serif" style="font-size: 19px; font-weight: 700">{{ current.name || '未填称呼' }}</div>
              <div class="muted xsmall">{{ current.mobile || '未填手机号' }} · 提交于 {{ formatDateTime(current.created_at) }}</div>
            </div>
          </div>
          <span class="pill" :class="STATUS_CLASS[current.status] || ''">
            {{ CUSTOM_REQUEST_STATUS_LABEL[current.status] || current.status }}
          </span>
        </div>

        <div class="detail-grid">
          <div class="field"><span class="field-label">服务摄影师</span><span>{{ current.photographer || '未指定（由工作室安排）' }}</span></div>
          <div class="field"><span class="field-label">拍摄类型</span><span>{{ current.project_type || '—' }}</span></div>
          <div class="field"><span class="field-label">期望日期</span><span>{{ current.expected_date || '待定' }}</span></div>
          <div class="field"><span class="field-label">期望地点</span><span>{{ current.location || '待定' }}</span></div>
          <div class="field"><span class="field-label">预算</span><span class="strong">{{ budgetText(current) }}</span></div>
          <div class="field"><span class="field-label">客户档案</span><span>{{ customerHint }}</span></div>
          <div class="field"><span class="field-label">参考图</span><span>{{ imageParts(current).length }} 张</span></div>
        </div>

        <div class="divider"></div>
        <div class="section-title" style="margin-top: 0"><h2>详细需求</h2></div>
        <div class="field">
          <textarea class="textarea" readonly rows="5" :value="current.detail || '—'"></textarea>
        </div>

        <template v-if="imageUrls(current).length">
          <div class="section-title" style="margin-top: 0"><h2>参考图片</h2></div>
          <div class="image-grid">
            <a v-for="(u, i) in imageUrls(current)" :key="i" :href="u" target="_blank" rel="noopener">
              <img :src="u" :alt="`参考图 ${i + 1}`" />
            </a>
          </div>
        </template>
        <p v-else-if="imageParts(current).length" class="xsmall muted">
          参考图暂为上传前的本地路径（H5 上传链路未打通），暂无法预览。
        </p>

        <template v-if="current.response">
          <div class="divider"></div>
          <div class="section-title" style="margin-top: 0"><h2>响应记录</h2></div>
          <div class="field">
            <textarea class="textarea" readonly rows="2" :value="current.response"></textarea>
          </div>
          <p class="xsmall muted" style="margin-top: 4px">
            {{ current.response_at ? formatDateTime(current.response_at) : '' }}
          </p>
        </template>

        <div class="drawer-actions">
          <button
            v-if="current.status === CUSTOM_REQUEST_STATUS.PENDING"
            v-perm="'request:handle'"
            class="btn btn-outline"
            @click="respondOpen = true"
          >
            响应需求
          </button>
          <button
            v-if="current.status !== CUSTOM_REQUEST_STATUS.CLOSED"
            v-perm="'request:handle'"
            class="btn btn-primary"
            @click="openConvert(current)"
          >
            转为订单
          </button>
        </div>
      </div>
    </div>

    <!-- 响应弹窗 -->
    <BaseModal :open="respondOpen" title="响应定制需求" @close="respondOpen = false">
      <form id="respond-form" class="form-grid" @submit.prevent="saveRespond">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 响应说明</label>
          <textarea
            v-model="respondText"
            class="input"
            rows="4"
            placeholder="如：已与客户沟通，推荐「轻写真」套餐，预计下周确认档期"
          ></textarea>
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="respondOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="respond-form" :disabled="respondBusy">
          {{ respondBusy ? '提交中…' : '确认响应' }}
        </button>
      </template>
    </BaseModal>

    <!-- 转订单弹窗 -->
    <BaseModal :open="convertOpen" title="定制需求转订单" :width="560" @close="convertOpen = false">
      <form id="convert-form" class="form-grid form-grid-2" @submit.prevent="saveConvert">
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label"><span class="req">*</span> 套餐</label>
          <select v-model.number="convertForm.package_id" class="select">
            <option :value="0" disabled>请选择套餐</option>
            <option v-for="p in packageOptions" :key="p.id" :value="p.id">
              {{ p.name }}（{{ money(p.base_price) }}）
            </option>
          </select>
          <span v-if="selectedPackage" class="xsmall muted" style="margin-top: 4px">
            定金 {{ money(selectedPackage.deposit_amt) }}（{{ selectedPackage.deposit_rate }}%）
          </span>
          <span v-else-if="!packageOptions.length" class="xsmall muted" style="margin-top: 4px">
            暂无已上架套餐，请先到「套餐管理」上架后再转单。
          </span>
        </div>
        <div class="field">
          <label class="field-label">拍摄日期</label>
          <input v-model="convertForm.shoot_date" class="input" type="date" />
        </div>
        <div class="field">
          <label class="field-label">时段</label>
          <input v-model="convertForm.shoot_time" class="input" placeholder="如 10:00-12:30" />
        </div>
        <div class="field">
          <label class="field-label">拍摄地点</label>
          <input v-model="convertForm.shoot_address" class="input" placeholder="如 越秀公园" />
        </div>
        <div class="field">
          <label class="field-label">加片金额（元）</label>
          <input v-model.number="convertForm.addon_amount" class="input" type="number" min="0" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">备注</label>
          <textarea
            v-model="convertForm.remark"
            class="input"
            rows="2"
            placeholder="留空则自动写入「来源：定制需求 / 类型 / 期望日期 / 预算 / 需求」摘要"
          ></textarea>
        </div>
      </form>
      <p class="xsmall muted">
        转单后该需求会自动标记为「已响应」，并按手机号关联客户档案（查不到则自动建档）。
      </p>
      <template #foot>
        <button class="btn btn-ghost" @click="convertOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="convert-form" :disabled="convertBusy">
          {{ convertBusy ? '转单中…' : '确认转单' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
/* 摄影师筛选行：紧贴状态页签下方（页签自带下边距，这里只补竖向对齐与间距） */
.cr-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
}

/* detail-hero / detail-grid 不在全局样式表里，各页自持一份（与 OrdersView / CustomersView 一致） */
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

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
}

.image-grid a {
  display: block;
  aspect-ratio: 1;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}

.image-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 0 4px;
}
</style>
