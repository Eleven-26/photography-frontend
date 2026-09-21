<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as membersApi from '@/api/members'
import * as settingsApi from '@/api/settings'
import { uploadFiles } from '@/api/upload'
import { useFetch } from '@/composables/useFetch'
import { initials, formatDateTime } from '@/utils/format'
import type { PaymentMethod, PermGroup, SysRole } from '@/types'
import { DATA_SCOPE, DATA_SCOPE_HINT, DATA_SCOPE_LABEL, PAYMENT_METHOD_TYPE, PAYMENT_METHOD_TYPE_LABEL } from '@/constants/enums'

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
  /** 分享封面图（预约主页 / 分享页顶部大图）；空串 = 清空 */
  cover_url: '',
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
    studioForm.cover_url = s.cover_url || ''
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

/**
 * 分享封面图上传。
 *
 * 封面是**对外物料**（会出现在客户浏览的 H5 预约主页顶部），而 H5 浏览者通常未登录，
 * 因此必须 `public=1` 让后端落免鉴权的 `/media` 目录 —— 走默认的 `/uploads` 会整片 401。
 *
 * ⚠️ 上传后**立即落库**，不再依赖页头「保存修改」。本页其余字段是"改完统一保存"，
 * 但封面是"选完图就想看到效果"的一次性动作：早前要求再点一次保存，实测用户上传完
 * 直接离开，回头发现又变回「未设置」，表现为"保存失败"（2026-09-15 排查确认：
 * 后端侧 3 次上传全部成功，但 `/settings/studio/update` 一次都没被调用）。
 */
const uploadingCover = ref(false)
const coverInput = ref<HTMLInputElement | null>(null)

/** 站内相对路径（/media、/uploads）与外链都算已设置；空串/异常值视为未设置 */
const isImageUrl = (u?: string) => !!u && (/^(https?:)?\/\//.test(u) || u.startsWith('/'))

function openCoverPicker() {
  coverInput.value?.click()
}

async function onPickCover(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = '' // 复位，保证连续选同一文件也能触发 change
  if (!files.length) return
  uploadingCover.value = true
  try {
    const { results, errors } = await uploadFiles(files.slice(0, 1), 'studio', 0, true)
    if (!results.length) {
      toastErr(errors[0]?.message || '封面上传失败')
      return
    }
    await saveCover(results[0].url)
  } finally {
    uploadingCover.value = false
  }
}

/**
 * 落库封面（传空串即清空）。**成功后才回填**表单与本地缓存——失败时界面不撒谎。
 * 与小程序端「我的预约主页」同口径（那边本就是选完即写库）。
 */
async function saveCover(url: string) {
  try {
    await settingsApi.studioUpdate({ cover_url: url })
    studioForm.cover_url = url
    if (studioSetting.data) studioSetting.data.cover_url = url
    toastOk(url ? '封面已更新' : '封面已移除')
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '封面保存失败')
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

/* ── 角色权限配置（RBAC 勾选树）────────────────── */
const rolePermOpen = ref(false)
const rolePermLoading = ref(false)
const rolePermSaving = ref(false)
const rolePermRole = ref<SysRole | null>(null)
/** 权限点全量清单：整个页面共享一份（首次打开时拉取） */
const permCatalog = ref<PermGroup[]>([])
const rolePermForm = reactive<{ data_scope: number; permissions: string[] }>({
  data_scope: DATA_SCOPE.ALL,
  permissions: []
})

function openRolePerms(r: SysRole) {
  rolePermRole.value = r
  rolePermForm.data_scope = r.data_scope || DATA_SCOPE.ALL
  rolePermForm.permissions = []
  rolePermOpen.value = true
  void loadRolePerms(r.id)
}

async function loadRolePerms(id: number) {
  rolePermLoading.value = true
  try {
    if (!permCatalog.value.length) {
      permCatalog.value = await membersApi.roleCatalog()
    }
    const conf = await membersApi.rolePerms(id)
    rolePermForm.data_scope = conf.data_scope
    rolePermForm.permissions = conf.permissions || []
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '权限配置加载失败')
    closeRolePerms()
  } finally {
    rolePermLoading.value = false
  }
}

function closeRolePerms() {
  rolePermOpen.value = false
  rolePermRole.value = null
}

function groupAllChecked(g: PermGroup) {
  return g.perms.length > 0 && g.perms.every((p) => rolePermForm.permissions.includes(p.key))
}

function groupIndeterminate(g: PermGroup) {
  const hit = g.perms.filter((p) => rolePermForm.permissions.includes(p.key)).length
  return hit > 0 && hit < g.perms.length
}

function toggleGroup(g: PermGroup, checked: boolean) {
  const keys = g.perms.map((p) => p.key)
  if (checked) {
    rolePermForm.permissions = [...new Set([...rolePermForm.permissions, ...keys])]
  } else {
    rolePermForm.permissions = rolePermForm.permissions.filter((k) => !keys.includes(k))
  }
}

function checkAllRolePerms(all: boolean) {
  rolePermForm.permissions = all
    ? permCatalog.value.flatMap((g) => g.perms.map((p) => p.key))
    : []
}

async function saveRolePerms() {
  if (!rolePermRole.value) return
  rolePermSaving.value = true
  try {
    await membersApi.grantRolePerms(rolePermRole.value.id, {
      data_scope: rolePermForm.data_scope,
      permissions: rolePermForm.permissions
    })
    toastOk('权限已保存，已登录成员将即时生效')
    closeRolePerms()
    await roles.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '保存失败')
  } finally {
    rolePermSaving.value = false
  }
}

const statusTone: Record<number, string> = {
  1: 'status-ok',
  0: 'status-disabled'
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>工作室设置</h1>
        <p>把工作空间、成员权限、渠道和收款方式配置好，业务才能自动运转。</p>
      </div>
      <div class="page-actions">
        <button v-if="tab === 'members'" v-perm="'user:create'" class="btn btn-primary" @click="inviteOpen = true">+ 邀请成员</button>
        <button v-else-if="tab === 'studio'" v-perm="'settings:update'" class="btn btn-primary" :disabled="savingStudio" @click="saveStudio">
          {{ savingStudio ? '保存中…' : '保存修改' }}
        </button>
        <button v-else-if="tab === 'payments'" v-perm="'settings:update'" class="btn btn-primary" @click="openPay()">+ 添加收款方式</button>
        <button v-else-if="tab === 'logs'" class="btn btn-outline" @click="logs.load()">刷新</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'studio' }" @click="tab = 'studio'">工作室信息</button>
      <button v-perm="'user:view'" class="tab" :class="{ active: tab === 'members' }" @click="tab = 'members'">成员与权限</button>
      <button v-perm="'role:view'" class="tab" :class="{ active: tab === 'roles' }" @click="tab = 'roles'">角色</button>
      <button class="tab" :class="{ active: tab === 'payments' }" @click="tab = 'payments'">收款方式</button>
      <button v-perm="'log:view'" class="tab" :class="{ active: tab === 'logs' }" @click="tab = 'logs'">操作日志</button>
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
          <div class="field" style="grid-column: 1 / -1">
            <label class="field-label">分享封面图</label>
            <div class="up-row">
              <div
                class="up-thumb"
                :class="{ 'is-empty': !isImageUrl(studioForm.cover_url) }"
                :style="
                  isImageUrl(studioForm.cover_url)
                    ? { backgroundImage: `url(${studioForm.cover_url})` }
                    : undefined
                "
              >
                <span v-if="!isImageUrl(studioForm.cover_url)">未设置</span>
              </div>
              <div class="up-side">
                <div class="up-btns">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline"
                    :disabled="uploadingCover"
                    @click="openCoverPicker"
                  >
                    {{ uploadingCover ? '上传中…' : studioForm.cover_url ? '更换封面' : '上传封面' }}
                  </button>
                  <button
                    v-if="studioForm.cover_url"
                    type="button"
                    class="btn btn-sm btn-ghost"
                    :disabled="uploadingCover"
                    @click="saveCover('')"
                  >
                    移除
                  </button>
                </div>
                <p class="up-hint">
                  客户分享出去时，预约主页（H5）顶部显示的大图；建议 3:2 横图。
                  <strong>选图后立即生效，无需再点「保存修改」</strong>；不设置则使用纯色底，页面照常可访问。
                </p>
              </div>
            </div>
            <input ref="coverInput" type="file" accept="image/*" class="up-input" @change="onPickCover" />
          </div>
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
          <div class="list-card-title">
            {{ r.name }} <span class="tag">{{ r.code }}</span>
            <span v-if="r.code === 'admin'" class="tag" style="margin-left: 6px">内置超管</span>
          </div>
          <div class="flex wrap gap-6 mt-12">
            <span class="tag" style="background: var(--lav); color: var(--lav-dark)">{{ r.remark }}</span>
            <span class="tag">{{ DATA_SCOPE_LABEL[r.data_scope] || '全部数据' }}</span>
            <span class="tag">{{ r.permission_count ?? 0 }} 个权限点</span>
          </div>
        </div>
        <div class="flex gap-6" style="margin-left: auto">
          <button
            v-perm="'role:grant'"
            class="btn btn-sm btn-outline"
            :disabled="r.code === 'admin'"
            :title="r.code === 'admin' ? '超管权限由代码短路固定，不可修改' : ''"
            @click="openRolePerms(r)"
          >
            配置权限
          </button>
        </div>
      </div>
      <div v-if="!roles.loading && !(roles.data || []).length" class="empty-state">
        <strong>暂无角色</strong>
      </div>
    </div>

    <!-- 角色权限配置弹窗 -->
    <BaseModal :open="rolePermOpen" :title="`配置权限 · ${rolePermRole?.name || ''}`" :width="680" @close="closeRolePerms">
      <div v-if="rolePermLoading" class="empty-state">加载中…</div>
      <template v-else>
        <!-- 数据范围 -->
        <div class="field" style="margin-bottom: 16px">
          <span class="field-label">数据范围（决定能「看到」哪些数据）</span>
          <div class="flex gap-6 wrap mt-8">
            <label v-for="s in [DATA_SCOPE.ALL, DATA_SCOPE.STORE, DATA_SCOPE.SELF]" :key="s" class="scope-option">
              <input v-model.number="rolePermForm.data_scope" type="radio" name="data_scope" :value="s" />
              <span class="strong">{{ DATA_SCOPE_LABEL[s] }}</span>
              <span class="muted xsmall">{{ DATA_SCOPE_HINT[s] }}</span>
            </label>
          </div>
          <p v-if="rolePermRole?.code === 'admin'" class="muted xsmall mt-8">
            超管角色由后端按角色码短路放行，此配置不会生效。
          </p>
        </div>

        <!-- 权限勾选树 -->
        <div class="perm-tree">
          <div class="flex between" style="margin-bottom: 10px">
            <span class="field-label">功能权限（决定能「操作」哪些功能）</span>
            <div class="flex gap-6">
              <button class="btn btn-sm btn-ghost" @click="checkAllRolePerms(true)">全选</button>
              <button class="btn btn-sm btn-ghost" @click="checkAllRolePerms(false)">清空</button>
            </div>
          </div>
          <div v-for="g in permCatalog" :key="g.module" class="perm-group">
            <div class="perm-group-head">
              <label class="flex gap-6" style="align-items: center; cursor: pointer">
                <input
                  type="checkbox"
                  :checked="groupAllChecked(g)"
                  :indeterminate.prop="groupIndeterminate(g)"
                  @change="toggleGroup(g, ($event.target as HTMLInputElement).checked)"
                />
                <strong>{{ g.module }}</strong>
                <span class="muted xsmall">{{ g.perms.length }} 项</span>
              </label>
            </div>
            <div class="perm-items">
              <label v-for="p in g.perms" :key="p.key" class="perm-item" :title="p.key">
                <input v-model="rolePermForm.permissions" type="checkbox" :value="p.key" />
                <span>{{ p.label }}</span>
              </label>
            </div>
          </div>
        </div>
        <p class="muted xsmall mt-12">已选 {{ rolePermForm.permissions.length }} 个权限点；保存为全量覆盖，未勾选的权限将被移除。</p>
      </template>
      <template #foot>
        <button class="btn btn-ghost" @click="closeRolePerms">取消</button>
        <button class="btn btn-primary" :disabled="rolePermLoading || rolePermSaving" @click="saveRolePerms">
          {{ rolePermSaving ? '保存中…' : '保存' }}
        </button>
      </template>
    </BaseModal>

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

/* ── 角色权限配置 ─────────────────────────────── */
.scope-option {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
}

.scope-option:has(input:checked) {
  border-color: var(--ink, #222);
  background: var(--cream, #faf7f2);
}

.perm-tree {
  max-height: 380px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px;
}

.perm-group {
  padding: 8px 0;
}

.perm-group + .perm-group {
  border-top: 1px dashed var(--line);
}

.perm-group-head {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
}

.perm-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding-left: 24px;
}

.perm-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink, #222);
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 6px;
}

.perm-item:hover {
  background: var(--cream, #faf7f2);
}

/* 分享封面上传（规格与 PortfolioView 的 up-* 一致，两处保持同一套观感） */
.up-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.up-thumb {
  flex-shrink: 0;
  width: 96px;
  height: 64px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background-position: center;
  background-size: cover;
}

.up-thumb.is-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--muted);
  background: linear-gradient(160deg, #e7e2d8, #c9c2b4);
}

.up-side {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.up-btns {
  display: flex;
  gap: 6px;
}

.up-hint {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.up-input {
  display: none;
}
</style>
