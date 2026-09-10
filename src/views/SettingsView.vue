<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as membersApi from '@/api/members'
import * as settingsApi from '@/api/settings'
import { useFetch } from '@/composables/useFetch'
import { initials, formatDateTime } from '@/utils/format'
import type { PaymentMethod } from '@/types'
import { PAYMENT_METHOD_TYPE, PAYMENT_METHOD_TYPE_LABEL } from '@/types'

const tab = ref<'studio' | 'members' | 'roles' | 'payments' | 'logs'>('studio')

const members = useFetch(() => membersApi.listUsers())
const roles = useFetch(() => membersApi.listRoles())

/* ── 工作室信息（公司基础信息 + 预约主页 / 接单规则）── */
const ws = useFetch(() => settingsApi.workspace())
const studioSetting = useFetch(() => settingsApi.studioGet())

const companyForm = reactive({
  name: '',
  city: '',
  intro: '',
  contact_name: '',
  contact_phone: '',
  address: ''
})

watch(
  () => ws.data?.company,
  (c) => {
    if (!c) return
    companyForm.name = c.name || ''
    companyForm.city = c.city || ''
    companyForm.intro = c.intro || ''
    companyForm.contact_name = c.contact_name || ''
    companyForm.contact_phone = c.contact_phone || ''
    companyForm.address = c.address || ''
  },
  { immediate: true }
)

const studioForm = reactive({
  slogan: '',
  homepage_slug: '',
  accept_new: 1,
  lock_minutes: 15,
  reschedule_free_hours: 72,
  reschedule_fee_rate: 20,
  reschedule_min_hours: 24,
  select_deadline_hours: 72,
  retain_days: 30
})

watch(
  () => studioSetting.data,
  (s) => {
    if (!s) return
    studioForm.slogan = s.slogan || ''
    studioForm.homepage_slug = s.homepage_slug || ''
    studioForm.accept_new = s.accept_new
    studioForm.lock_minutes = s.lock_minutes
    studioForm.reschedule_free_hours = s.reschedule_free_hours
    studioForm.reschedule_fee_rate = s.reschedule_fee_rate
    studioForm.reschedule_min_hours = s.reschedule_min_hours
    studioForm.select_deadline_hours = s.select_deadline_hours
    studioForm.retain_days = s.retain_days
  },
  { immediate: true }
)

const homepagePublished = computed(() => !!studioSetting.data?.homepage_slug)

const savingStudio = ref(false)

async function saveStudio() {
  if (!companyForm.name.trim()) {
    toastErr('工作空间名称不能为空')
    return
  }
  savingStudio.value = true
  try {
    await settingsApi.updateCompany({ ...companyForm })
    await settingsApi.studioUpdate({ ...studioForm })
    toastOk('设置已保存')
    ws.load()
    studioSetting.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '保存失败')
  } finally {
    savingStudio.value = false
  }
}

/* ── 收款方式 ─────────────────────────────────── */
const payments = useFetch(() => settingsApi.listPaymentMethods())

const payOpen = ref(false)
const payForm = reactive({
  id: 0,
  name: '',
  type: PAYMENT_METHOD_TYPE.WECHAT as string,
  account_name: '',
  account_no: '',
  qrcode: '',
  status: 1,
  sort: 0
})

const payTypes = [
  PAYMENT_METHOD_TYPE.WECHAT,
  PAYMENT_METHOD_TYPE.ALIPAY,
  PAYMENT_METHOD_TYPE.BANK,
  PAYMENT_METHOD_TYPE.CASH,
  PAYMENT_METHOD_TYPE.OTHER
]

function openPay(m?: PaymentMethod) {
  if (m) {
    Object.assign(payForm, {
      id: m.id,
      name: m.name,
      type: m.type || PAYMENT_METHOD_TYPE.WECHAT,
      account_name: m.account_name,
      account_no: m.account_no,
      qrcode: m.qrcode,
      status: m.status,
      sort: m.sort
    })
  } else {
    Object.assign(payForm, {
      id: 0,
      name: '',
      type: PAYMENT_METHOD_TYPE.WECHAT,
      account_name: '',
      account_no: '',
      qrcode: '',
      status: 1,
      sort: 0
    })
  }
  payOpen.value = true
}

async function savePay() {
  if (!payForm.name.trim()) {
    toastErr('请填写展示名称')
    return
  }
  const payload = {
    name: payForm.name.trim(),
    type: payForm.type,
    account_name: payForm.account_name,
    account_no: payForm.account_no,
    qrcode: payForm.qrcode,
    status: payForm.status,
    sort: payForm.sort
  }
  try {
    if (payForm.id) {
      await settingsApi.updatePaymentMethod(payForm.id, payload)
    } else {
      await settingsApi.createPaymentMethod(payload)
    }
    toastOk('收款方式已保存')
    payOpen.value = false
    payments.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '保存失败')
  }
}

async function removePay(m: PaymentMethod) {
  try {
    await settingsApi.deletePaymentMethod(m.id)
    toastOk('已删除')
    payments.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '删除失败')
  }
}

/* ── 操作日志 ─────────────────────────────────── */
const logFilter = reactive({
  keyword: '',
  module: '',
  status: '' as number | '',
  page: 1,
  page_size: 20
})

const logs = useFetch(
  () =>
    settingsApi.listOperationLogs({
      keyword: logFilter.keyword,
      module: logFilter.module,
      status: logFilter.status,
      page: logFilter.page,
      page_size: logFilter.page_size
    }),
  false
)

const logModules = ['order', 'customer', 'lead', 'package', 'asset', 'finance', 'settings', 'auth']

watch(
  () => logFilter.page,
  () => logs.load()
)

watch(tab, (t) => {
  if (t === 'logs') logs.load()
})

function searchLogs() {
  logFilter.page = 1
  logs.load()
}

function logTone(status: number) {
  return status === 1 ? 'status-ok' : 'status-error'
}

const totalLogs = () => logs.data?.total || 0
const logPages = () => Math.max(1, Math.ceil(totalLogs() / logFilter.page_size))

/* ── 成员 ─────────────────────────────────────── */
const inviteOpen = ref(false)
const inviteBusy = ref(false)
const inviteForm = ref({ username: '', nickname: '', mobile: '', password: '', role_id: 3 })

async function saveMember() {
  const f = inviteForm.value
  if (!f.username.trim() || !f.nickname.trim() || !f.mobile.trim()) {
    toastErr('请填写用户名、姓名与手机号')
    return
  }
  if (!f.password) {
    toastErr('请设置初始密码')
    return
  }
  inviteBusy.value = true
  try {
    await membersApi.createUser({ ...f })
    toastOk(`已创建成员 ${f.nickname}`)
    inviteOpen.value = false
    inviteForm.value = { username: '', nickname: '', mobile: '', password: '', role_id: 3 }
    members.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '创建失败')
  } finally {
    inviteBusy.value = false
  }
}

/** 角色名映射：成员表按 role_id 展示可读名称 */
function roleName(id: number) {
  return roles.data?.find((r) => r.id === id)?.name || `角色 ${id}`
}

const statusTone: Record<number, string> = {
  1: 'status-ok',
  0: 'status-disabled'
}
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>工作室设置</h1>
        <p>把工作空间、成员权限、渠道和收款方式配置好，业务才能自动运转。</p>
      </div>
      <div class="page-actions">
        <button v-if="tab === 'members'" class="btn btn-primary" @click="inviteOpen = true">+ 邀请成员</button>
        <button v-else-if="tab === 'studio'" class="btn btn-primary" :disabled="savingStudio" @click="saveStudio">
          {{ savingStudio ? '保存中…' : '保存修改' }}
        </button>
        <button v-else-if="tab === 'payments'" class="btn btn-primary" @click="openPay()">+ 添加收款方式</button>
        <button v-else-if="tab === 'logs'" class="btn btn-outline" @click="logs.load()">刷新</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'studio' }" @click="tab = 'studio'">工作室信息</button>
      <button class="tab" :class="{ active: tab === 'members' }" @click="tab = 'members'">成员与权限</button>
      <button class="tab" :class="{ active: tab === 'roles' }" @click="tab = 'roles'">角色</button>
      <button class="tab" :class="{ active: tab === 'payments' }" @click="tab = 'payments'">收款方式</button>
      <button class="tab" :class="{ active: tab === 'logs' }" @click="tab = 'logs'">操作日志</button>
    </div>

    <!-- 工作室信息 -->
    <div v-if="tab === 'studio'">
      <div v-if="ws.error || studioSetting.error" class="data-source-tip">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
        设置加载失败：{{ ws.error || studioSetting.error }}
        <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="ws.load(); studioSetting.load()">
          重试
        </button>
      </div>

      <div class="card profile-banner">
        <div class="avatar">{{ initials(companyForm.name || 'S') }}</div>
        <div>
          <h3>{{ companyForm.name || '未命名工作室' }}</h3>
          <p>{{ companyForm.city || '未填写城市' }} · 创建于 {{ formatDateTime(ws.data?.company?.created_at) || '—' }}</p>
          <div class="tag-row">
            <span class="pill" :class="homepagePublished ? 'mint' : ''">
              {{ homepagePublished ? '预约主页已发布' : '预约主页未发布' }}
            </span>
            <span class="pill">{{ (ws.data?.payment_methods || []).length }} 个收款方式</span>
          </div>
        </div>
      </div>

      <div class="card card-pad mt-14">
        <div class="section-head-inline">
          <h2>基础信息</h2>
          <span class="muted xsmall">对外展示</span>
        </div>
        <div class="form-grid form-grid-2" style="max-width: 720px">
          <div class="field">
            <label class="field-label">工作空间名称</label>
            <input v-model="companyForm.name" class="input" />
          </div>
          <div class="field">
            <label class="field-label">所在城市</label>
            <input v-model="companyForm.city" class="input" placeholder="如 广州" />
          </div>
          <div class="field" style="grid-column: 1 / -1">
            <label class="field-label">工作室简介</label>
            <textarea v-model="companyForm.intro" class="textarea" placeholder="对外展示的一两句介绍"></textarea>
          </div>
          <div class="field">
            <label class="field-label">联系人</label>
            <input v-model="companyForm.contact_name" class="input" />
          </div>
          <div class="field">
            <label class="field-label">联系电话</label>
            <input v-model="companyForm.contact_phone" class="input" />
          </div>
          <div class="field" style="grid-column: 1 / -1">
            <label class="field-label">详细地址</label>
            <input v-model="companyForm.address" class="input" />
          </div>
        </div>
      </div>

      <div class="card card-pad mt-14">
        <div class="section-head-inline">
          <h2>预约主页与接单</h2>
          <span class="muted xsmall">规则修改后实时同步到 H5</span>
        </div>
        <div class="form-grid form-grid-2" style="max-width: 720px">
          <div class="field">
            <label class="field-label">预约主页短链标识</label>
            <input v-model="studioForm.homepage_slug" class="input" placeholder="如 lu-studio" />
          </div>
          <div class="field">
            <label class="field-label">接收新预约</label>
            <select v-model.number="studioForm.accept_new" class="select">
              <option :value="1">接收</option>
              <option :value="0">暂停</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">下单临时锁定（分钟）</label>
            <input v-model.number="studioForm.lock_minutes" class="input" type="number" min="0" />
          </div>
          <div class="field">
            <label class="field-label">宣传语</label>
            <input v-model="studioForm.slogan" class="input" />
          </div>
        </div>
      </div>

      <div class="card card-pad mt-14">
        <div class="section-head-inline">
          <h2>改期与选片政策</h2>
        </div>
        <div class="form-grid form-grid-2" style="max-width: 720px">
          <div class="field">
            <label class="field-label">免费改期阈值（小时）</label>
            <input v-model.number="studioForm.reschedule_free_hours" class="input" type="number" min="0" />
          </div>
          <div class="field">
            <label class="field-label">改期调度费率（%）</label>
            <input v-model.number="studioForm.reschedule_fee_rate" class="input" type="number" min="0" />
          </div>
          <div class="field">
            <label class="field-label">距拍摄不足（小时）不可改期</label>
            <input v-model.number="studioForm.reschedule_min_hours" class="input" type="number" min="0" />
          </div>
          <div class="field">
            <label class="field-label">样片选片截止（小时）</label>
            <input v-model.number="studioForm.select_deadline_hours" class="input" type="number" min="0" />
          </div>
          <div class="field">
            <label class="field-label">未选原片保留（天）</label>
            <input v-model.number="studioForm.retain_days" class="input" type="number" min="0" />
          </div>
        </div>
      </div>

      <div class="card card-pad mt-14">
        <div class="section-head-inline">
          <h2>通知偏好</h2>
          <span class="muted xsmall">平台默认送达方式</span>
        </div>
        <div class="kv"><span>新线索 / 客户消息</span><strong class="pill mint">微信 + 站内</strong></div>
        <div class="kv"><span>付款待核验</span><strong class="pill mint">立即提醒</strong></div>
        <div class="kv"><span>交付截止提醒</span><strong class="pill">提前 2 天</strong></div>
      </div>
    </div>

    <!-- 成员 -->
    <div v-if="tab === 'members'">
      <div v-if="members.error" class="data-source-tip">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
        成员加载失败：{{ members.error }}
        <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="members.load()">重试</button>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>成员</th><th>角色</th><th>手机</th><th>状态</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="m in members.data?.list || []" :key="m.id">
                <td>
                  <div class="flex gap-6">
                    <span class="avatar">{{ initials(m.nickname || m.username) }}</span>
                    <span class="cell-main">{{ m.nickname || m.username }}</span>
                  </div>
                </td>
                <td><span class="tag">{{ roleName(m.role_id) }}</span></td>
                <td>{{ m.mobile }}</td>
                <td>
                  <span class="pill" :class="statusTone[m.status]">
                    {{ m.status === 1 ? '正常' : '停用' }}
                  </span>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 角色 -->
    <div v-if="tab === 'roles'">
      <div v-for="r in roles.data || []" :key="r.id" class="list-card" style="align-items: flex-start">
        <div class="list-card-left">
          <div class="list-card-title">{{ r.name }} <span class="tag">{{ r.code }}</span></div>
          <div class="flex wrap gap-6 mt-12">
            <span class="tag" style="background: var(--lav); color: var(--lav-dark)">{{ r.remark }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 收款方式 -->
    <div v-if="tab === 'payments'">
      <div v-if="payments.error" class="data-source-tip">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
        收款方式加载失败：{{ payments.error }}
        <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="payments.load()">重试</button>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>展示名称</th><th>类型</th><th>账户 / 持卡人</th><th>账号</th><th>状态</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="p in payments.data || []" :key="p.id">
                <td><span class="cell-main">{{ p.name }}</span></td>
                <td><span class="tag">{{ PAYMENT_METHOD_TYPE_LABEL[p.type] || p.type }}</span></td>
                <td>{{ p.account_name || '—' }}</td>
                <td>{{ p.account_no || '—' }}</td>
                <td>
                  <span class="pill" :class="p.status === 1 ? 'status-ok' : 'status-disabled'">
                    {{ p.status === 1 ? '已启用' : '已停用' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline" @click="openPay(p)">编辑</button>
                  <button class="btn btn-sm btn-ghost" @click="removePay(p)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!payments.loading && !(payments.data || []).length" class="empty-state">
          <strong>尚未配置收款方式</strong>
          <p>配置后，客户在 H5 / 小程序下单时可直接看到收款码。</p>
        </div>
      </div>
      <p class="muted xsmall mt-12">更换收款方式不会修改历史收款流水；新的订单将使用当前启用的默认方式。</p>
    </div>

    <!-- 操作日志 -->
    <div v-if="tab === 'logs'">
      <div v-if="logs.error" class="data-source-tip error">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
        日志加载失败：{{ logs.error }}
        <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="logs.load()">重试</button>
      </div>

      <div class="filter-bar">
        <div class="search-input">
          <svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input v-model="logFilter.keyword" class="input" placeholder="搜索操作人 / 行为 / 路径" @keyup.enter="searchLogs" />
        </div>
        <select v-model="logFilter.module" class="select" @change="searchLogs">
          <option value="">全部模块</option>
          <option v-for="m in logModules" :key="m" :value="m">{{ m }}</option>
        </select>
        <select v-model="logFilter.status" class="select" @change="searchLogs">
          <option value="">全部结果</option>
          <option :value="1">成功</option>
          <option :value="0">失败</option>
        </select>
        <button class="btn btn-outline" @click="searchLogs">查询</button>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>时间</th>
                <th>操作人</th>
                <th>模块</th>
                <th>操作行为</th>
                <th>请求</th>
                <th>IP</th>
                <th>结果</th>
                <th>耗时</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in logs.data?.list || []" :key="l.id">
                <td class="log-time">{{ formatDateTime(l.created_at) }}</td>
                <td>{{ l.username || `#${l.user_id}` }}</td>
                <td><span class="tag">{{ l.module || '—' }}</span></td>
                <td class="cell-main">{{ l.action || '—' }}</td>
                <td class="log-path">
                  <span class="tag">{{ l.method }}</span>
                  <span>{{ l.path }}</span>
                </td>
                <td class="log-ip">{{ l.ip || '—' }}</td>
                <td>
                  <span class="pill" :class="logTone(l.status)">{{ l.status === 1 ? '成功' : '失败' }}</span>
                </td>
                <td>{{ l.duration }} ms</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!logs.loading && !(logs.data?.list || []).length" class="empty-state">
          <strong>{{ logs.error ? '加载失败' : '暂无操作日志' }}</strong>
          <p>{{ logs.error ? logs.error : '系统会记录关键写操作，便于追溯。' }}</p>
        </div>
      </div>

      <div class="pager">
        <span class="muted xsmall">共 {{ totalLogs() }} 条 · 第 {{ logFilter.page }} / {{ logPages() }} 页</span>
        <div class="pager-pages">
          <button class="btn btn-sm btn-outline" :disabled="logFilter.page <= 1" @click="logFilter.page--">上一页</button>
          <button class="btn btn-sm btn-outline" :disabled="logFilter.page >= logPages()" @click="logFilter.page++">下一页</button>
        </div>
      </div>
    </div>

    <!-- 邀请成员 -->
    <BaseModal :open="inviteOpen" title="邀请成员" @close="inviteOpen = false">
      <form id="modal-form" class="form-grid" @submit.prevent="saveMember">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 用户名</label>
          <input v-model="inviteForm.username" class="input" />
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 姓名</label>
          <input v-model="inviteForm.nickname" class="input" />
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 手机号</label>
          <input v-model="inviteForm.mobile" class="input" placeholder="13800002874" />
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 密码</label>
          <input v-model="inviteForm.password" class="input" type="password" />
        </div>
        <div class="field">
          <label class="field-label">角色</label>
          <select v-model.number="inviteForm.role_id" class="select">
            <option v-for="r in roles.data || []" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="inviteOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="modal-form" :disabled="inviteBusy">
          {{ inviteBusy ? '创建中…' : '保存' }}
        </button>
      </template>
    </BaseModal>

    <!-- 收款方式 -->
    <BaseModal :open="payOpen" :title="payForm.id ? '编辑收款方式' : '添加收款方式'" @close="payOpen = false">
      <form id="pay-form" class="form-grid form-grid-2" @submit.prevent="savePay">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 展示名称</label>
          <input v-model="payForm.name" class="input" placeholder="如 微信收款码" />
        </div>
        <div class="field">
          <label class="field-label">方式类型</label>
          <select v-model="payForm.type" class="select">
            <option v-for="t in payTypes" :key="t" :value="t">{{ PAYMENT_METHOD_TYPE_LABEL[t] }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">账户 / 持卡人</label>
          <input v-model="payForm.account_name" class="input" />
        </div>
        <div class="field">
          <label class="field-label">账号</label>
          <input v-model="payForm.account_no" class="input" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">收款码图片地址</label>
          <input v-model="payForm.qrcode" class="input" placeholder="/uploads/..." />
        </div>
        <div class="field">
          <label class="field-label">启用状态</label>
          <select v-model.number="payForm.status" class="select">
            <option :value="1">已启用</option>
            <option :value="0">已停用</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">排序</label>
          <input v-model.number="payForm.sort" class="input" type="number" />
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="payOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="pay-form">保存设置</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.data-source-tip.error {
  color: var(--red, #c0392b);
}

.log-time {
  white-space: nowrap;
  font-size: 11px;
}

.log-path {
  max-width: 300px;
  white-space: normal;
  word-break: break-all;
  font-size: 11px;
}

.log-ip {
  font-size: 11px;
  white-space: nowrap;
}

.mt-14 {
  margin-top: 14px;
}

.section-head-inline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-head-inline h2 {
  font-size: 15px;
  margin: 0;
}

.profile-banner {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
}

.profile-banner .avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  background: var(--mint, #dff3e8);
  color: var(--mint-dark, #3f8f6b);
}

.profile-banner h3 {
  margin: 0 0 4px;
}

.profile-banner p {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 11px;
}

.tag-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 12px;
}

.kv:last-child {
  border-bottom: 0;
}
</style>
