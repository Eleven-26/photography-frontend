<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as customersApi from '@/api/customers'
import * as demo from '@/api/demo'
import { useFetch } from '@/composables/useFetch'
import { money, initials } from '@/utils/format'
import type { Customer } from '@/types'
import { CUSTOMER_LEVEL_LABEL } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  potential: '潜在客户',
  active: '活跃',
  inactive: '非活跃'
}

const STATUS_CLASS: Record<string, string> = {
  potential: 'status-pending',
  active: 'status-ok',
  inactive: 'status-muted'
}

const query = reactive({ keyword: '', status: '', page: 1, page_size: 12 })

const page = useFetch(
  () => customersApi.listCustomers(query as Record<string, unknown>),
  () => demo.demoCustomersPage(query as Record<string, unknown>)
)

const stats = useFetch(
  () => customersApi.customerStats(),
  () => demo.demoCustomerStats()
)

const customers = computed(() => page.data?.list || [])
const total = computed(() => page.data?.total || 0)

watch(() => [query.keyword, query.status, query.page], () => page.load())

const detailOpen = ref(false)
const detail = ref<Customer | null>(null)
const editing = ref(false)
const editBusy = ref(false)
const editForm = reactive({
  name: '',
  mobile: '',
  wechat: '',
  gender: 'unknown' as Customer['gender'],
  level: 'normal' as Customer['level'],
  source: '',
  tags: '',
  status: 'active' as Customer['status'],
  remark: ''
})

function openDetail(c: Customer) {
  detail.value = c
  editing.value = false
  detailOpen.value = true
}

function enterEdit() {
  if (!detail.value) return
  const c = detail.value
  editForm.name = c.name
  editForm.mobile = c.mobile
  editForm.wechat = c.wechat
  editForm.gender = c.gender
  editForm.level = c.level
  editForm.source = c.source
  editForm.tags = c.tags
  editForm.status = c.status
  editForm.remark = c.remark
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function saveEdit() {
  if (!detail.value) return
  if (!editForm.name.trim()) {
    toastErr('请输入客户姓名')
    return
  }
  editBusy.value = true
  try {
    try {
      await customersApi.updateCustomer(detail.value.id, { ...editForm })
      toastOk('客户已更新')
    } catch {
      toastOk('客户已更新（演示）')
    }
    editing.value = false
    page.load()
    stats.load()
  } finally {
    editBusy.value = false
  }
}

const genderLabel: Record<string, string> = { male: '男', female: '女', unknown: '未知' }

const createOpen = ref(false)
const form = reactive({
  name: '',
  mobile: '',
  source: '',
  level: 'normal' as Customer['level'],
  remark: ''
})

async function saveCustomer() {
  if (!form.name.trim()) {
    toastErr('请输入客户姓名')
    return
  }
  try {
    try {
      await customersApi.createCustomer({ ...form })
      toastOk('客户已创建')
    } catch {
      toastOk('客户已创建（演示）')
    }
    createOpen.value = false
    page.load()
    stats.load()
  } catch {
    /* noop */
  }
}
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>客户管理</h1>
        <p>客户档案、复购与偏好记录。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="page.load(); stats.load()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
        <button class="btn btn-primary" @click="createOpen = true">+ 新建客户</button>
      </div>
    </div>

    <div v-if="page.source === 'demo'" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
      演示数据（后端未连接）。
    </div>

    <div class="stats-grid stats-4">
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-orange"><svg class="icon" viewBox="0 0 24 24"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 9a6 6 0 0 0-12 0" /></svg></span>客户总数</div>
        <div class="stat-value">{{ stats.data?.total || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-mint"><svg class="icon" viewBox="0 0 24 24"><path d="M12 2v20m-7-7 7 7 7-7" /></svg></span>潜在客户</div>
        <div class="stat-value">{{ stats.data?.potential || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-lav"><svg class="icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg></span>活跃</div>
        <div class="stat-value">{{ stats.data?.active || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-yellow"><svg class="icon" viewBox="0 0 24 24"><path d="M12 2v20m-7-7 7 7 7-7" /></svg></span>非活跃</div>
        <div class="stat-value">{{ stats.data?.inactive || 0 }}</div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-input">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input v-model="query.keyword" class="input" placeholder="姓名 / 电话 / 编号" />
      </div>
      <select v-model="query.status" class="select">
        <option value="">全部状态</option>
        <option value="potential">潜在客户</option>
        <option value="active">活跃</option>
        <option value="inactive">非活跃</option>
      </select>
    </div>

    <div class="grid cols-3 g-16" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))">
      <div v-for="c in customers" :key="c.id" class="list-card" style="flex-direction: column; align-items: stretch">
        <div class="flex between">
          <div class="flex gap-10">
            <span class="avatar" style="width: 40px; height: 40px; font-size: 15px">{{ initials(c.name) }}</span>
            <div>
              <div class="list-card-title">{{ c.name }}</div>
              <div class="cell-sub">{{ c.code }}</div>
            </div>
          </div>
          <span class="pill" :class="STATUS_CLASS[c.status] || ''">
            {{ STATUS_LABEL[c.status] || c.status }}
          </span>
        </div>
        <div class="list-card-sub">
          <span>{{ c.mobile }}</span>
          <span class="tag">{{ CUSTOMER_LEVEL_LABEL[c.level] || c.level }}</span>
          <span v-if="c.source" class="tag">{{ c.source }}</span>
          <span v-for="t in String(c.tags || '').split(',').filter(Boolean)" :key="t" class="tag">{{ t }}</span>
        </div>
        <div class="detail-meta">
          <div><b>{{ c.order_count }}</b> 单</div>
          <div><b>{{ money(c.total_amount) }}</b> 累计</div>
        </div>
        <div class="flex between" style="margin-top: 6px">
          <span class="muted xsmall">{{ c.remark || '—' }}</span>
          <button class="btn btn-sm btn-outline" @click="openDetail(c)">档案</button>
        </div>
      </div>
    </div>
    <div v-if="!customers.length && !page.loading" class="empty-state">
      <strong>暂无客户</strong>
    </div>

    <div class="pager" v-if="total > query.page_size">
      <span>共 {{ total }} 条</span>
    </div>

    <!-- 客户档案抽屉 -->
    <div v-if="detailOpen" class="drawer-backdrop" @click="detailOpen = false"></div>
    <div v-if="detailOpen" class="drawer">
      <div class="drawer-head">
        <h3>客户档案</h3>
        <button class="modal-close" style="margin-left: auto" @click="detailOpen = false">
          <svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div class="drawer-body" v-if="detail">
        <div class="detail-hero">
          <div class="flex gap-10">
            <span class="avatar" style="width: 44px; height: 44px; font-size: 17px">{{ initials(editing ? editForm.name : detail.name) }}</span>
            <div>
              <div class="serif" style="font-size: 19px; font-weight: 700">{{ editing ? editForm.name : detail.name }}</div>
              <div class="muted xsmall">{{ detail.code }} · {{ detail.mobile }}</div>
            </div>
          </div>
        </div>

        <template v-if="!editing">
          <div class="detail-grid">
            <div class="field"><span class="field-label">编码</span><span>{{ detail.code }}</span></div>
            <div class="field"><span class="field-label">手机</span><span>{{ detail.mobile }}</span></div>
            <div class="field"><span class="field-label">微信</span><span>{{ detail.wechat || '—' }}</span></div>
            <div class="field"><span class="field-label">性别</span><span>{{ genderLabel[detail.gender] || '未知' }}</span></div>
            <div class="field"><span class="field-label">等级</span><span>{{ CUSTOMER_LEVEL_LABEL[detail.level] || detail.level }}</span></div>
            <div class="field"><span class="field-label">来源</span><span>{{ detail.source || '—' }}</span></div>
            <div class="field"><span class="field-label">状态</span><span>{{ STATUS_LABEL[detail.status] || detail.status }}</span></div>
            <div class="field"><span class="field-label">标签</span><span>{{ detail.tags || '—' }}</span></div>
            <div class="field"><span class="field-label">订单数</span><span>{{ detail.order_count }}</span></div>
            <div class="field"><span class="field-label">累计消费</span><span class="strong">{{ money(detail.total_amount) }}</span></div>
          </div>
          <div class="divider"></div>
          <div class="section-title" style="margin-top: 0"><h2>备注</h2></div>
          <div class="field">
            <textarea class="textarea" readonly :value="detail.remark || '—'"></textarea>
          </div>
        </template>

        <template v-else>
          <form class="form-grid form-grid-2" @submit.prevent="saveEdit" style="margin-top: 16px">
            <div class="field">
              <label class="field-label"><span class="req">*</span> 姓名</label>
              <input v-model="editForm.name" class="input" />
            </div>
            <div class="field">
              <label class="field-label">手机</label>
              <input v-model="editForm.mobile" class="input" />
            </div>
            <div class="field">
              <label class="field-label">微信</label>
              <input v-model="editForm.wechat" class="input" />
            </div>
            <div class="field">
              <label class="field-label">性别</label>
              <select v-model="editForm.gender" class="select">
                <option value="unknown">未知</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">等级</label>
              <select v-model="editForm.level" class="select">
                <option value="normal">普通</option>
                <option value="gold">黄金</option>
                <option value="platinum">铂金</option>
                <option value="diamond">钻石</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">来源</label>
              <input v-model="editForm.source" class="input" />
            </div>
            <div class="field">
              <label class="field-label">状态</label>
              <select v-model="editForm.status" class="select">
                <option value="potential">潜在客户</option>
                <option value="active">活跃</option>
                <option value="inactive">非活跃</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">标签</label>
              <input v-model="editForm.tags" class="input" placeholder="逗号分隔" />
            </div>
            <div class="field" style="grid-column: 1 / -1">
              <label class="field-label">备注</label>
              <textarea v-model="editForm.remark" class="textarea" rows="2"></textarea>
            </div>
          </form>
        </template>
      </div>
      <div class="drawer-foot">
        <button class="btn btn-ghost" @click="detailOpen = false">关闭</button>
        <template v-if="!editing">
          <button class="btn btn-primary" @click="enterEdit">编辑档案</button>
        </template>
        <template v-else>
          <button class="btn btn-ghost" @click="cancelEdit">取消</button>
          <button class="btn btn-primary" :disabled="editBusy" @click="saveEdit">保存</button>
        </template>
      </div>
    </div>

    <BaseModal :open="createOpen" title="新建客户" @close="createOpen = false">
      <form id="modal-form" class="form-grid form-grid-2" @submit.prevent="saveCustomer">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 姓名</label>
          <input v-model="form.name" class="input" />
        </div>
        <div class="field">
          <label class="field-label">手机</label>
          <input v-model="form.mobile" class="input" placeholder="13800002874" />
        </div>
        <div class="field">
          <label class="field-label">等级</label>
          <select v-model="form.level" class="select">
            <option value="normal">普通</option>
            <option value="gold">黄金</option>
            <option value="platinum">铂金</option>
            <option value="diamond">钻石</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">来源</label>
          <select v-model="form.source" class="select">
            <option value="">选择来源</option>
            <option value="小红书">小红书</option>
            <option value="抖音">抖音</option>
            <option value="微信">微信</option>
            <option value="转介绍">转介绍</option>
            <option value="到店">到店</option>
            <option value="预约主页">预约主页</option>
          </select>
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">备注</label>
          <textarea v-model="form.remark" class="textarea" placeholder="偏好、注意事项等"></textarea>
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="createOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="modal-form">保存</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.detail-hero {
  display: flex;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px dashed var(--line);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px 16px;
  padding: 16px 0 4px;
}

.detail-meta {
  display: flex;
  gap: 18px;
  margin-top: 11px;
  font-size: 11px;
  color: var(--muted);
}

.detail-meta b {
  color: var(--ink);
  font-size: 13px;
}
</style>
