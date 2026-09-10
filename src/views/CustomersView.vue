<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as customersApi from '@/api/customers'
import { useFetch } from '@/composables/useFetch'
import { money, initials } from '@/utils/format'
import type { Customer } from '@/types'
import { CUSTOMER_LEVEL_LABEL, CUSTOMER_STATUS_LABEL } from '@/types'
import { CUSTOMER_LEVEL, CUSTOMER_STATUS } from '@/types'

const STATUS_LABEL = CUSTOMER_STATUS_LABEL

const STATUS_CLASS: Record<number, string> = {
  [CUSTOMER_STATUS.POTENTIAL]: 'status-pending',
  [CUSTOMER_STATUS.ACTIVE]: 'status-ok',
  [CUSTOMER_STATUS.INACTIVE]: 'status-muted'
}

const query = reactive({ keyword: '', status: '' as number | '', page: 1, page_size: 12 })

// 客户列表与统计：失败即提示，不回退演示数据
const page = useFetch(() => customersApi.listCustomers(query as Record<string, unknown>))
const stats = useFetch(() => customersApi.customerStats())

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
  level: CUSTOMER_LEVEL.NORMAL as Customer['level'],
  source: '',
  tags: '',
  status: CUSTOMER_STATUS.ACTIVE as Customer['status'],
  remark: '',
  // 通知许可 0-不允许 1-允许：后端用指针语义接收，显式 0 才能真正关闭
  allow_notifications: 1,
  prefer_style: '',
  prefer_scene: ''
})

async function openDetail(c: Customer) {
  detail.value = c
  editing.value = false
  detailOpen.value = true
  // 详情接口额外返回满意度等派生字段（列表接口不返回），打开后再覆盖一次
  try {
    detail.value = await customersApi.customerDetail(c.id)
  } catch {
    // 详情拉取失败时保留列表数据，不阻断档案查看
  }
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
  editForm.allow_notifications = c.allow_notifications ?? 1
  editForm.prefer_style = c.prefer_style || ''
  editForm.prefer_scene = c.prefer_scene || ''
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
    await customersApi.updateCustomer(detail.value.id, { ...editForm })
    toastOk('客户已更新')
    editing.value = false
    page.load()
    stats.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '更新失败')
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
  level: CUSTOMER_LEVEL.NORMAL as Customer['level'],
  remark: ''
})

async function saveCustomer() {
  if (!form.name.trim()) {
    toastErr('请输入客户姓名')
    return
  }
  try {
    await customersApi.createCustomer({ ...form })
    toastOk('客户已创建')
    createOpen.value = false
    page.load()
    stats.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '创建失败')
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

    <div v-if="page.error" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      客户数据加载失败：{{ page.error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="page.load(); stats.load()">重试</button>
    </div>

    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr))">
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
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-mint"><svg class="icon" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.7-5.7L20 8m0-5v5h-5" /></svg></span>复购客户</div>
        <div class="stat-value">{{ stats.data?.repurchase_count || 0 }}</div>
        <div class="stat-sub">复购率 {{ (stats.data?.repurchase_rate || 0).toFixed(1) }}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-lav"><svg class="icon" viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" /></svg></span>黄金及以上</div>
        <div class="stat-value">{{ stats.data?.gold_up || 0 }}</div>
        <div class="stat-sub">本月新增 {{ stats.data?.new_this_month || 0 }}</div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-input">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input v-model="query.keyword" class="input" placeholder="姓名 / 电话 / 编号" />
      </div>
      <select v-model="query.status" class="select">
        <option value="">全部状态</option>
        <option :value="CUSTOMER_STATUS.POTENTIAL">潜在客户</option>
        <option :value="CUSTOMER_STATUS.ACTIVE">活跃</option>
        <option :value="CUSTOMER_STATUS.INACTIVE">非活跃</option>
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
            <div class="field"><span class="field-label">满意度</span><span class="strong">{{ detail.satisfaction ? detail.satisfaction.toFixed(1) : '暂无评价' }}</span></div>
            <div class="field"><span class="field-label">复购</span><span>{{ detail.order_count >= 2 ? '复购客户' : '首次消费' }}</span></div>
          </div>
          <div class="divider"></div>
          <div class="section-title" style="margin-top: 0"><h2>客户偏好</h2></div>
          <div class="detail-grid">
            <div class="field"><span class="field-label">通知许可</span><span>{{ (detail.allow_notifications ?? 1) === 1 ? '允许' : '不允许' }}</span></div>
            <div class="field"><span class="field-label">偏好风格</span><span>{{ detail.prefer_style || '—' }}</span></div>
            <div class="field"><span class="field-label">常用场景</span><span>{{ detail.prefer_scene || '—' }}</span></div>
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
                <option :value="CUSTOMER_LEVEL.NORMAL">普通</option>
                <option :value="CUSTOMER_LEVEL.GOLD">黄金</option>
                <option :value="CUSTOMER_LEVEL.PLATINUM">铂金</option>
                <option :value="CUSTOMER_LEVEL.DIAMOND">钻石</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">来源</label>
              <input v-model="editForm.source" class="input" />
            </div>
            <div class="field">
              <label class="field-label">状态</label>
              <select v-model="editForm.status" class="select">
                <option :value="CUSTOMER_STATUS.POTENTIAL">潜在客户</option>
                <option :value="CUSTOMER_STATUS.ACTIVE">活跃</option>
                <option :value="CUSTOMER_STATUS.INACTIVE">非活跃</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">标签</label>
              <input v-model="editForm.tags" class="input" placeholder="逗号分隔" />
            </div>
            <div class="field">
              <label class="field-label">通知许可</label>
              <select v-model.number="editForm.allow_notifications" class="select">
                <option :value="1">允许</option>
                <option :value="0">不允许</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">偏好风格</label>
              <input v-model="editForm.prefer_style" class="input" placeholder="如 自然·生活感" />
            </div>
            <div class="field">
              <label class="field-label">常用场景</label>
              <input v-model="editForm.prefer_scene" class="input" placeholder="如 户外公园" />
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
            <option :value="CUSTOMER_LEVEL.NORMAL">普通</option>
            <option :value="CUSTOMER_LEVEL.GOLD">黄金</option>
            <option :value="CUSTOMER_LEVEL.PLATINUM">铂金</option>
            <option :value="CUSTOMER_LEVEL.DIAMOND">钻石</option>
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
