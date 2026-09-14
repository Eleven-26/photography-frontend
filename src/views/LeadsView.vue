<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import BaseModal from '@/components/BaseModal.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import { useFetch } from '@/composables/useFetch'
import { useStudioSetting } from '@/composables/useStudioSetting'
import * as leadApi from '@/api/leads'
import { createOrder } from '@/api/orders'
import { listPackages } from '@/api/packages'
import {
  LEAD_STATUS,
  LEAD_STATUS_LABEL,
  QUOTE_STATUS,
  QUOTE_STATUS_LABEL,
  BRIEF_ITEM_STATUS,
  BRIEF_ITEM_STATUS_LABEL,
  LEAD_MESSAGE_DIRECTION
} from '@/types'
import type { Lead, LeadBriefItem, LeadMessage, Package, Quote } from '@/types'
import { money, formatDate, formatDateTime, initials } from '@/utils/format'

const router = useRouter()

/* ── 列表 ─────────────────────────────────────── */
const filter = reactive({
  status: '' as number | '',
  keyword: '',
  page: 1,
  page_size: 20
})

const page = useFetch(() => leadApi.listLeads({ ...filter }))
const leads = computed(() => page.data?.list || [])
const total = computed(() => page.data?.total || 0)

watch(
  () => filter.status,
  () => {
    filter.page = 1
    page.load()
  }
)

function search() {
  filter.page = 1
  page.load()
}

const mode = ref<'board' | 'list'>('board')

/** 看板泳道：原型四列 + 已流失，保持与后端 LEAD_STATUS 一致 */
const lanes = [LEAD_STATUS.PENDING, LEAD_STATUS.QUOTING, LEAD_STATUS.QUOTED, LEAD_STATUS.CONFIRMED, LEAD_STATUS.LOSE]

function laneLeads(status: number) {
  return leads.value.filter((l) => l.status === status)
}

const statusTone: Record<number, string> = {
  [LEAD_STATUS.PENDING]: 'status-pending',
  [LEAD_STATUS.QUOTING]: 'status-info',
  [LEAD_STATUS.QUOTED]: 'status-ok',
  [LEAD_STATUS.CONFIRMED]: 'status-complete',
  [LEAD_STATUS.LOSE]: 'status-error'
}

/* ── 详情抽屉 ─────────────────────────────────── */
const detailOpen = ref(false)
const current = ref<Lead | null>(null)
const tab = ref<'brief' | 'messages' | 'quotes'>('brief')

const briefItems = ref<LeadBriefItem[]>([])
const messages = ref<LeadMessage[]>([])
const quotes = ref<Quote[]>([])
const detailLoading = ref(false)
const detailError = ref('')

const briefConfirmed = computed(() => briefItems.value.filter((i) => i.status === BRIEF_ITEM_STATUS.CONFIRMED))
const briefPending = computed(() => briefItems.value.filter((i) => i.status !== BRIEF_ITEM_STATUS.CONFIRMED))

async function openDetail(l: Lead) {
  current.value = l
  tab.value = 'brief'
  detailOpen.value = true
  await reloadDetail()
}

async function reloadDetail() {
  const l = current.value
  if (!l) return
  detailLoading.value = true
  detailError.value = ''
  const [b, m, q] = await Promise.allSettled([
    leadApi.listLeadBrief(l.id),
    leadApi.listLeadMessages(l.id),
    leadApi.listQuotes(l.id)
  ])
  briefItems.value = b.status === 'fulfilled' ? b.value || [] : []
  messages.value = m.status === 'fulfilled' ? m.value || [] : []
  quotes.value = q.status === 'fulfilled' ? q.value || [] : []
  const failed = [b, m, q].filter((r) => r.status === 'rejected')
  if (failed.length === 3) {
    detailError.value = (failed[0] as PromiseRejectedResult).reason?.message || '详情加载失败'
  }
  detailLoading.value = false
}

/** 按钮忙碌态：避免重复提交（逐项独立，不阻塞其它操作） */
const busy = ref('')
async function run(key: string, fn: () => Promise<void>) {
  if (busy.value) return
  busy.value = key
  try {
    await fn()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '操作失败')
  } finally {
    busy.value = ''
  }
}

/* 需求摘要 */
function generateBrief() {
  const l = current.value
  if (!l) return
  return run('brief', async () => {
    briefItems.value = (await leadApi.generateLeadBrief(l.id)) || []
    toastOk('需求摘要已生成')
  })
}

/* 沟通记录 */
const messageDraft = ref('')

function sendMessage() {
  const l = current.value
  const content = messageDraft.value.trim()
  if (!l) return
  if (!content) {
    toastErr('请填写消息内容')
    return
  }
  return run('message', async () => {
    await leadApi.sendLeadMessage(l.id, { content, channel: 'h5', msg_type: 2 })
    messageDraft.value = ''
    messages.value = (await leadApi.listLeadMessages(l.id)) || []
    toastOk('已发送')
  })
}

/* 报价 */
const quoteOpen = ref(false)
const quoteSaving = ref(false)
const quoteForm = reactive({ package_id: 0, addon_price: 0, shoot_date: '', remark: '' })
const packageOptions = ref<Package[]>([])

async function openQuote() {
  const l = current.value
  if (!l) return
  quoteForm.package_id = 0
  quoteForm.addon_price = 0
  quoteForm.shoot_date = l.shoot_date || ''
  quoteForm.remark = ''
  if (!packageOptions.value.length) {
    try {
      const res = await listPackages({ page: 1, page_size: 100, status: 2 })
      packageOptions.value = res.list || []
    } catch {
      packageOptions.value = []
    }
  }
  quoteOpen.value = true
}

const quotePreview = computed(() => {
  const p = packageOptions.value.find((x) => x.id === quoteForm.package_id)
  if (!p) return null
  const addon = Number(quoteForm.addon_price) || 0
  return { base: p.base_price, addon, total: p.base_price + addon }
})

async function saveQuote() {
  const l = current.value
  if (!l) return
  if (!quoteForm.package_id) {
    toastErr('请选择套餐')
    return
  }
  quoteSaving.value = true
  try {
    await leadApi.createQuote(l.id, {
      package_id: quoteForm.package_id,
      addon_price: Number(quoteForm.addon_price) || 0,
      shoot_date: quoteForm.shoot_date,
      remark: quoteForm.remark
    })
    quoteOpen.value = false
    quotes.value = (await leadApi.listQuotes(l.id)) || []
    toastOk('报价已创建并发送')
    await page.load()
    if (current.value) current.value = leads.value.find((x) => x.id === current.value?.id) || current.value
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '创建报价失败')
  } finally {
    quoteSaving.value = false
  }
}

function changeQuoteStatus(q: Quote, status: number) {
  return run(`quote-${q.id}`, async () => {
    await leadApi.setQuoteStatus(q.id, status)
    if (current.value) quotes.value = (await leadApi.listQuotes(current.value.id)) || []
    toastOk(`报价已${QUOTE_STATUS_LABEL[status] || '更新'}`)
    await page.load()
  })
}

/* 跟进 / 状态 / 转订单 */
function follow(l: Lead) {
  return run(`follow-${l.id}`, async () => {
    await leadApi.followLead(l.id, { remark: '管理端标记跟进' })
    toastOk('已记录一次跟进')
    await page.load()
    if (current.value?.id === l.id) {
      current.value = leads.value.find((x) => x.id === l.id) || current.value
    }
  })
}

function loseLead(l: Lead) {
  return run(`lose-${l.id}`, async () => {
    await leadApi.updateLead(l.id, { status: LEAD_STATUS.LOSE } as Partial<Lead>)
    toastOk('已标记为流失')
    detailOpen.value = false
    await page.load()
  })
}

/* 转订单 */
const convertOpen = ref(false)
const convertSaving = ref(false)
const convertForm = reactive({
  package_id: 0,
  shoot_date: '',
  shoot_time: '',
  shoot_address: '',
  addon_amount: 0,
  remark: ''
})

const latestQuote = computed(() => quotes.value[0] || null)

async function openConvert() {
  const l = current.value
  if (!l) return
  if (!packageOptions.value.length) {
    try {
      const res = await listPackages({ page: 1, page_size: 100, status: 2 })
      packageOptions.value = res.list || []
    } catch {
      packageOptions.value = []
    }
  }
  convertForm.package_id = latestQuote.value?.package_id || 0
  convertForm.addon_amount = latestQuote.value?.addon_price || 0
  convertForm.shoot_date = latestQuote.value?.shoot_date || l.shoot_date || ''
  convertForm.shoot_time = latestQuote.value?.shoot_time || ''
  convertForm.shoot_address = ''
  convertForm.remark = `由线索 ${l.code} 转化`
  convertOpen.value = true
}

async function saveConvert() {
  const l = current.value
  if (!l) return
  if (!convertForm.package_id) {
    toastErr('请选择套餐')
    return
  }
  convertSaving.value = true
  try {
    // 线索未关联客户时先转化出客户档案，再据其创建订单
    let customerId = l.customer_id
    if (!customerId) {
      const customer = await leadApi.convertLead(l.id)
      customerId = customer.id
    }
    await createOrder({
      customer_id: customerId,
      lead_id: l.id,
      quote_id: latestQuote.value?.id || 0,
      package_id: convertForm.package_id,
      addon_amount: Number(convertForm.addon_amount) || 0,
      shoot_date: convertForm.shoot_date,
      shoot_time: convertForm.shoot_time,
      shoot_address: convertForm.shoot_address,
      remark: convertForm.remark
    })
    // 报价单同步置为已成交（后端失败不阻断主流程）
    if (latestQuote.value) {
      try {
        await leadApi.setQuoteStatus(latestQuote.value.id, QUOTE_STATUS.CONVERTED)
      } catch {
        /* 忽略：订单已创建 */
      }
    }
    convertOpen.value = false
    detailOpen.value = false
    toastOk('已转为正式订单')
    await page.load()
    router.push('/orders')
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '转订单失败')
  } finally {
    convertSaving.value = false
  }
}

/* ── 新建线索 ─────────────────────────────────── */
const createOpen = ref(false)
const createSaving = ref(false)
const createForm = reactive({
  name: '',
  mobile: '',
  source: '微信',
  project_type: '',
  budget_min: 0,
  budget_max: 0,
  shoot_date: '',
  remark: ''
})

const sources = ['微信', '小红书', '抖音', '预约主页', '转介绍', '电话']

function openCreate() {
  Object.assign(createForm, {
    name: '',
    mobile: '',
    source: '微信',
    project_type: '',
    budget_min: 0,
    budget_max: 0,
    shoot_date: '',
    remark: ''
  })
  createOpen.value = true
}

async function saveLead() {
  if (!createForm.name.trim()) {
    toastErr('请填写客户姓名')
    return
  }
  createSaving.value = true
  try {
    await leadApi.createLead({ ...createForm } as Partial<Lead>)
    createOpen.value = false
    toastOk('线索已创建')
    await page.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '创建线索失败')
  } finally {
    createSaving.value = false
  }
}

/* ── 分享预约入口 ─────────────────────────────── */
// 预约主页地址同样由**后端下发**（studio/get 的 homepage_url = share.h5_base_url
// + slug + 分享人 staff_id）：改域名只需改 Nacos 配置。
// 旧实现拼 `${window.location.origin}/h5/booking`，既是管理端自己的域名、
// 又是管理端并不存在的路由，复制出去必然打不开。
const { setting: studioSetting, load: loadStudioSetting } = useStudioSetting()
void loadStudioSetting()

async function copyBookingLink() {
  const link = studioSetting.value?.homepage_url
  if (!link) {
    void loadStudioSetting()
    toastErr('暂无可分享地址：请先在「设置 · 预约主页短链标识」填写工作室标识')
    return
  }
  try {
    await navigator.clipboard.writeText(link)
    toastOk('预约入口链接已复制')
  } catch {
    toastErr(`复制失败，链接：${link}`)
  }
}
</script>

<template>
  <div>
    <AppToast />

    <div class="page-head">
      <div>
        <h1>线索与报价</h1>
        <p>共 {{ total }} 条线索 · 从客户咨询到拿下订单的每一步。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="copyBookingLink">
          <svg class="icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
          分享预约入口
        </button>
        <button v-perm="'lead:create'" class="btn btn-primary" @click="openCreate">+ 新建线索</button>
      </div>
    </div>

    <div v-if="page.error" class="data-source-tip error">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      线索加载失败：{{ page.error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="page.load()">重试</button>
    </div>

    <div class="lead-toolbar">
      <div class="seg">
        <button :class="{ active: mode === 'board' }" @click="mode = 'board'">看板</button>
        <button :class="{ active: mode === 'list' }" @click="mode = 'list'">列表</button>
      </div>
      <button class="tab-chip" :class="{ active: filter.status === '' }" @click="filter.status = ''">
        全部 · {{ total }}
      </button>
      <button
        v-for="(label, key) in LEAD_STATUS_LABEL"
        :key="key"
        class="tab-chip"
        :class="{ active: filter.status === Number(key) }"
        @click="filter.status = Number(key)"
      >
        {{ label }}
      </button>
      <div class="search-input" style="margin-left: auto; min-width: 220px">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input v-model="filter.keyword" class="input" placeholder="搜索客户 / 项目 / 备注" @keyup.enter="search" />
      </div>
      <button class="btn btn-outline" @click="search">查询</button>
    </div>

    <!-- 看板 -->
    <div v-if="mode === 'board'" class="board">
      <div v-for="st in lanes" :key="st" class="lane">
        <div class="lane-head">
          <strong>{{ LEAD_STATUS_LABEL[st] }}</strong>
          <span>{{ laneLeads(st).length }}</span>
        </div>
        <div
          v-for="l in laneLeads(st)"
          :key="l.id"
          class="list-card lead-card"
          @click="openDetail(l)"
        >
          <span class="avatar" style="width: 34px; height: 34px; font-size: 13px">{{ initials(l.name) }}</span>
          <div class="list-card-left">
            <div class="list-card-title">
              {{ l.name }}
              <span class="tag">{{ l.source || '未知来源' }}</span>
            </div>
            <div class="list-card-sub">
              <b>{{ l.project_type || '未填类型' }}</b>
              <span v-if="l.follower" class="muted">跟进 {{ l.follower }} 次</span>
            </div>
            <p class="lead-msg">{{ l.remark || '暂无需求备注' }}</p>
            <div class="lead-foot">
              <span class="muted xsmall">
                {{ l.budget_max ? `${money(l.budget_min)} - ${money(l.budget_max)}` : '预算待确认' }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="!laneLeads(st).length" class="lane-empty">暂无</div>
      </div>
    </div>

    <!-- 列表 -->
    <div v-else class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>客户</th>
              <th>项目类型</th>
              <th>需求</th>
              <th>预算</th>
              <th>状态</th>
              <th>最近跟进</th>
              <th style="width: 130px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in leads" :key="l.id">
              <td>
                <div class="flex gap-6">
                  <span class="avatar">{{ initials(l.name) }}</span>
                  <div>
                    <div class="cell-main">{{ l.name }}</div>
                    <div class="cell-sub">{{ l.code }} · {{ l.source || '—' }}</div>
                  </div>
                </div>
              </td>
              <td>{{ l.project_type || '—' }}</td>
              <td class="lead-remark-cell">{{ l.remark || '—' }}</td>
              <td>{{ l.budget_max ? `${money(l.budget_min)} - ${money(l.budget_max)}` : '待确认' }}</td>
              <td><span class="pill" :class="statusTone[l.status]">{{ LEAD_STATUS_LABEL[l.status] || '—' }}</span></td>
              <td>{{ l.last_follow_at ? formatDateTime(l.last_follow_at) : '—' }}</td>
              <td>
                <div class="flex gap-6">
                  <button class="btn btn-sm btn-outline" @click="openDetail(l)">详情</button>
                  <button v-perm="'lead:update'" class="btn btn-sm btn-primary" :disabled="!!busy" @click="follow(l)">跟进</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!leads.length" class="empty-state">
        <strong>{{ page.error ? '加载失败' : '暂无线索' }}</strong>
        <p>{{ page.error ? page.error : '匹配不到符合条件的线索。' }}</p>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <div v-if="detailOpen" class="drawer-backdrop" @click="detailOpen = false"></div>
    <div v-if="detailOpen" class="drawer">
      <div class="drawer-head">
        <div>
          <h3>{{ current?.name || '线索详情' }}</h3>
          <p class="muted xsmall" style="margin: 4px 0 0">
            {{ current?.code }} · {{ current?.source || '—' }} ·
            <span class="pill" :class="statusTone[current?.status || 0]">{{ LEAD_STATUS_LABEL[current?.status || 0] || '—' }}</span>
          </p>
        </div>
        <button class="modal-close" style="margin-left: auto" @click="detailOpen = false">
          <svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="drawer-body" v-if="detailError" style="display: grid; place-items: center; color: var(--muted); text-align: center">
        <div>
          <strong>详情加载失败</strong>
          <p class="xsmall mt-8">{{ detailError }}</p>
          <button class="btn btn-sm btn-outline mt-8" @click="reloadDetail">重试</button>
        </div>
      </div>

      <template v-else-if="current">
        <div class="drawer-body">
          <div class="detail-hero">
            <div>
              <div class="muted xsmall">意向项目</div>
              <div class="serif" style="font-size: 17px; font-weight: 700">{{ current.project_type || '未填写' }}</div>
            </div>
            <div style="text-align: right">
              <div class="muted xsmall">预算区间</div>
              <div class="strong">
                {{ current.budget_max ? `${money(current.budget_min)} - ${money(current.budget_max)}` : '待确认' }}
              </div>
            </div>
          </div>

          <div class="detail-tabs">
            <button class="detail-tab" :class="{ active: tab === 'brief' }" @click="tab = 'brief'">
              需求摘要<span class="detail-tab-count">{{ briefConfirmed.length }}</span>
            </button>
            <button class="detail-tab" :class="{ active: tab === 'messages' }" @click="tab = 'messages'">
              沟通记录<span class="detail-tab-count">{{ messages.length }}</span>
            </button>
            <button class="detail-tab" :class="{ active: tab === 'quotes' }" @click="tab = 'quotes'">
              报价历史<span class="detail-tab-count">{{ quotes.length }}</span>
            </button>
          </div>

          <div v-if="detailLoading" class="muted xsmall">加载中…</div>

          <!-- 需求摘要 -->
          <template v-if="tab === 'brief'">
            <div class="ai-box">
              <div class="ai-head">
                <svg class="icon" viewBox="0 0 24 24"><path d="M12 3v3M12 18v3M4.2 7.2l2.1 2.1M17.7 14.7l2.1 2.1M3 12h3M18 12h3M4.2 16.8l2.1-2.1M17.7 9.3l2.1-2.1" /></svg>
                需求摘要 · 已确认 {{ briefConfirmed.length }} 项，待追问 {{ briefPending.length }} 项
              </div>
              <p style="margin: 0">{{ current.remark || '暂未记录客户原话，建议补充后再生成摘要。' }}</p>
            </div>

            <div v-if="briefConfirmed.length" class="brief-group">
              <h4>已确认信息</h4>
              <div v-for="it in briefConfirmed" :key="it.id" class="brief-row">
                <strong>{{ it.title }}</strong>
                <span>{{ it.value || '—' }}</span>
              </div>
            </div>

            <div v-if="briefPending.length" class="brief-group">
              <h4>还缺少 / 待追问</h4>
              <div v-for="it in briefPending" :key="it.id" class="brief-row">
                <strong>{{ it.title }}</strong>
                <span>{{ it.question || it.ai_suggestion || '—' }}</span>
                <span class="pill status-pending">{{ BRIEF_ITEM_STATUS_LABEL[it.status] || '待追问' }}</span>
              </div>
            </div>

            <div v-if="!briefConfirmed.length && !briefPending.length" class="empty-state">
              <strong>暂无需求摘要</strong>
              <p>点击下方「生成需求摘要」将线索信息整理成结构化条目。</p>
            </div>
          </template>

          <!-- 沟通记录 -->
          <template v-if="tab === 'messages'">
            <div v-if="messages.length" class="msg-list">
              <div
                v-for="m in messages"
                :key="m.id"
                class="msg-row"
                :class="{ out: m.direction === LEAD_MESSAGE_DIRECTION.OUTBOUND }"
              >
                <div class="msg-bubble">
                  <div>{{ m.content }}</div>
                  <div class="msg-meta">
                    {{ m.direction === LEAD_MESSAGE_DIRECTION.OUTBOUND ? '工作室' : '客户' }} ·
                    {{ m.channel || '—' }} · {{ formatDateTime(m.created_at) }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <strong>暂无沟通记录</strong>
              <p>线下沟通可在下方补录，方便后续同事接手。</p>
            </div>

            <div class="msg-compose">
              <textarea v-model="messageDraft" class="input" rows="2" placeholder="输入要发送给客户的消息…" />
              <button class="btn btn-primary" :disabled="!!busy" @click="sendMessage">
                {{ busy === 'message' ? '发送中…' : '发送' }}
              </button>
            </div>
          </template>

          <!-- 报价历史 -->
          <template v-if="tab === 'quotes'">
            <div v-if="quotes.length" class="quote-list">
              <div v-for="q in quotes" :key="q.id" class="quote-card">
                <div class="flex between">
                  <strong>{{ q.title || q.package_name }} · V{{ q.version }}</strong>
                  <span class="pill" :class="q.status === QUOTE_STATUS.ACCEPTED || q.status === QUOTE_STATUS.CONVERTED ? 'status-ok' : q.status === QUOTE_STATUS.REJECTED ? 'status-error' : 'status-info'">
                    {{ QUOTE_STATUS_LABEL[q.status] || '—' }}
                  </span>
                </div>
                <div class="quote-meta">
                  {{ q.code }} · {{ q.package_name }} · 基础 {{ money(q.base_price) }}
                  <template v-if="q.addon_price"> + 加选 {{ money(q.addon_price) }}</template>
                </div>
                <div class="quote-total">报价总额 {{ money(q.total_price) }}</div>
                <div class="flex gap-6 mt-12">
                  <button
                    v-if="q.status === QUOTE_STATUS.DRAFT"
                    v-perm="'quote:update'"
                    class="btn btn-sm btn-outline"
                    :disabled="!!busy"
                    @click="changeQuoteStatus(q, QUOTE_STATUS.SENT)"
                  >
                    标记已发送
                  </button>
                  <button
                    v-if="q.status === QUOTE_STATUS.SENT || q.status === QUOTE_STATUS.DRAFT"
                    v-perm="'quote:update'"
                    class="btn btn-sm btn-primary"
                    :disabled="!!busy"
                    @click="changeQuoteStatus(q, QUOTE_STATUS.ACCEPTED)"
                  >
                    标记已接受
                  </button>
                  <button
                    v-if="q.status === QUOTE_STATUS.SENT || q.status === QUOTE_STATUS.DRAFT"
                    v-perm="'quote:update'"
                    class="btn btn-sm btn-outline"
                    :disabled="!!busy"
                    @click="changeQuoteStatus(q, QUOTE_STATUS.REJECTED)"
                  >
                    标记已拒绝
                  </button>
                  <span v-if="q.valid_until" class="muted xsmall" style="align-self: center">
                    有效期至 {{ formatDate(q.valid_until) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <strong>暂无报价历史</strong>
              <p>点击下方「创建报价」生成 V1。</p>
            </div>
          </template>
        </div>

        <div class="drawer-foot drawer-foot-wrap">
          <button v-perm="'lead:update'" class="btn btn-ghost" :disabled="!!busy" @click="follow(current)">
            {{ busy === `follow-${current.id}` ? '处理中…' : '标记跟进' }}
          </button>
          <button v-perm="'lead:update'" class="btn btn-ghost" :disabled="!!busy" @click="generateBrief">生成需求摘要</button>
          <button
            v-if="current.status !== LEAD_STATUS.LOSE && current.status !== LEAD_STATUS.CONFIRMED"
            v-perm="'lead:update'"
            class="btn btn-danger-ghost"
            :disabled="!!busy"
            @click="loseLead(current)"
          >
            标记流失
          </button>
          <button v-perm="'quote:create'" class="btn btn-outline" :disabled="!!busy" @click="openQuote">创建报价</button>
          <button v-perm="'lead:convert'" class="btn btn-primary" :disabled="!!busy" @click="openConvert">转订单</button>
        </div>
      </template>
    </div>

    <!-- 新建线索 -->
    <BaseModal :open="createOpen" title="新建线索" @close="createOpen = false">
      <form id="lead-form" class="form-grid form-grid-2" @submit.prevent="saveLead">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 客户姓名</label>
          <input v-model="createForm.name" class="input" placeholder="例如：周悦" />
        </div>
        <div class="field">
          <label class="field-label">手机号</label>
          <input v-model="createForm.mobile" class="input" placeholder="13800000000" />
        </div>
        <div class="field">
          <label class="field-label">来源渠道</label>
          <select v-model="createForm.source" class="select">
            <option v-for="s in sources" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">拍摄类型</label>
          <input v-model="createForm.project_type" class="input" placeholder="例如：亲子写真" />
        </div>
        <div class="field">
          <label class="field-label">预算下限（元）</label>
          <input v-model.number="createForm.budget_min" class="input" type="number" min="0" />
        </div>
        <div class="field">
          <label class="field-label">预算上限（元）</label>
          <input v-model.number="createForm.budget_max" class="input" type="number" min="0" />
        </div>
        <div class="field">
          <label class="field-label">意向拍摄日期</label>
          <input v-model="createForm.shoot_date" class="input" type="date" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">客户原话 / 备注</label>
          <textarea v-model="createForm.remark" class="input" rows="3" placeholder="粘贴客户的咨询内容，后续可生成需求摘要" />
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="createOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="lead-form" :disabled="createSaving">
          {{ createSaving ? '保存中…' : '保存线索' }}
        </button>
      </template>
    </BaseModal>

    <!-- 创建报价 -->
    <BaseModal :open="quoteOpen" title="创建报价" @close="quoteOpen = false">
      <form id="quote-form" class="form-grid form-grid-2" @submit.prevent="saveQuote">
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label"><span class="req">*</span> 选择套餐</label>
          <select v-model.number="quoteForm.package_id" class="select">
            <option :value="0" disabled>请选择套餐</option>
            <option v-for="p in packageOptions" :key="p.id" :value="p.id">
              {{ p.name }}（{{ money(p.base_price) }}）
            </option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">加选金额（元）</label>
          <input v-model.number="quoteForm.addon_price" class="input" type="number" min="0" step="0.01" />
        </div>
        <div class="field">
          <label class="field-label">拍摄日期</label>
          <input v-model="quoteForm.shoot_date" class="input" type="date" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">给客户的说明</label>
          <textarea v-model="quoteForm.remark" class="input" rows="2" placeholder="报价包含拍摄、基础精修与线上交付…" />
        </div>
        <div v-if="quotePreview" class="quote-preview" style="grid-column: 1 / -1">
          <div class="kv"><span>基础金额</span><strong>{{ money(quotePreview.base) }}</strong></div>
          <div class="kv"><span>加选金额</span><strong>{{ money(quotePreview.addon) }}</strong></div>
          <div class="kv"><span>报价总额</span><strong>{{ money(quotePreview.total) }}</strong></div>
        </div>
        <p v-else-if="!packageOptions.length" class="xsmall muted" style="grid-column: 1 / -1">
          暂无可售套餐，请先在「套餐管理」上架套餐。
        </p>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="quoteOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="quote-form" :disabled="quoteSaving">
          {{ quoteSaving ? '提交中…' : '创建并发送报价' }}
        </button>
      </template>
    </BaseModal>

    <!-- 转订单 -->
    <BaseModal :open="convertOpen" title="转为正式订单" @close="convertOpen = false">
      <form id="convert-form" class="form-grid form-grid-2" @submit.prevent="saveConvert">
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label"><span class="req">*</span> 套餐</label>
          <select v-model.number="convertForm.package_id" class="select">
            <option :value="0" disabled>请选择套餐</option>
            <option v-for="p in packageOptions" :key="p.id" :value="p.id">
              {{ p.name }}（{{ money(p.base_price) }}）
            </option>
          </select>
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
          <label class="field-label">加选金额（元）</label>
          <input v-model.number="convertForm.addon_amount" class="input" type="number" min="0" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">备注</label>
          <textarea v-model="convertForm.remark" class="input" rows="2" />
        </div>
        <p class="xsmall muted" style="grid-column: 1 / -1">
          线索尚未关联客户时会先自动建立客户档案；订单创建后可在「订单管理」继续推进收款与档期。
        </p>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="convertOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="convert-form" :disabled="convertSaving">
          {{ convertSaving ? '创建中…' : '创建订单' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.data-source-tip.error {
  color: var(--red, #c0392b);
}

.lead-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.tab-chip {
  border: 1px solid var(--line);
  background: var(--white);
  color: var(--muted);
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
}

.tab-chip.active {
  border-color: var(--orange);
  color: var(--orange-dark, var(--orange));
  font-weight: 600;
}

.board {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 8px;
}

.lane {
  flex: 1 1 0;
  min-width: 210px;
  background: var(--cream, #faf7f2);
  border: 1px solid var(--line);
  border-radius: var(--radius, 12px);
  padding: 10px;
}

.lane-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  margin-bottom: 10px;
  color: var(--ink-2, #333);
}

.lane-empty {
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  padding: 18px 0;
}

.lead-card {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  cursor: pointer;
  margin-bottom: 8px;
}

.lead-msg {
  font-size: 11px;
  color: var(--muted);
  margin: 6px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lead-foot {
  margin-top: 6px;
}

.lead-remark-cell {
  max-width: 300px;
  white-space: normal;
  font-size: 12px;
  color: var(--muted);
}

.detail-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 2px 0 14px;
  border-bottom: 1px dashed var(--line);
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

.ai-box {
  border: 1px solid var(--line);
  background: var(--cream, #faf7f2);
  border-radius: 10px;
  padding: 12px;
  font-size: 12px;
}

.ai-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--orange-dark, var(--orange));
  margin-bottom: 8px;
}

.brief-group {
  margin-top: 16px;
}

.brief-group h4 {
  font-size: 12px;
  margin: 0 0 8px;
}

.brief-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12px;
  margin-bottom: 6px;
}

.brief-row strong {
  min-width: 74px;
}

.brief-row span {
  flex: 1;
}

.msg-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg-row {
  display: flex;
}

.msg-row.out {
  justify-content: flex-end;
}

.msg-bubble {
  max-width: 82%;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  background: var(--white);
}

.msg-row.out .msg-bubble {
  background: var(--mint, #e8f3ee);
  border-color: transparent;
}

.msg-meta {
  font-size: 10px;
  color: var(--muted);
  margin-top: 4px;
}

.msg-compose {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  margin-top: 14px;
}

.msg-compose textarea {
  flex: 1;
}

.quote-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quote-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
}

.quote-meta {
  color: var(--muted);
  font-size: 11px;
  margin-top: 5px;
}

.quote-total {
  margin-top: 6px;
  font-weight: 700;
}

.quote-preview {
  border: 1px dashed var(--line);
  border-radius: 10px;
  padding: 10px 12px;
}

.quote-preview .kv {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
}

.drawer-foot-wrap {
  flex-wrap: wrap;
  gap: 8px;
}
</style>
