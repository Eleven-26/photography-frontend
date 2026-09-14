<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as deliveryApi from '@/api/delivery'
import * as orderApi from '@/api/orders'
import * as membersApi from '@/api/members'
import { uploadFiles } from '@/api/upload'
import { useFetch } from '@/composables/useFetch'
import { formatDate } from '@/utils/format'
import type { DeliveryListItem, Order, SysUser } from '@/types'
import { DELIVERY_STAGE, DELIVERY_STAGE_LABEL } from '@/types'

const router = useRouter()

// 交付看板：真实 API，失败即提示，不回退演示数据
const board = useFetch(() => deliveryApi.listDeliveries({ page: 1, page_size: 200 }))

const rows = computed<DeliveryListItem[]>(() => board.data?.list || [])

/** 看板泳道：与后端阶段 1-4 一一对应（5-已交付不进看板，计入「已交付」统计） */
const LANES = [
  { stage: DELIVERY_STAGE.PENDING_SAMPLES, hint: '等待上传样片' },
  { stage: DELIVERY_STAGE.SELECTING, hint: '等待客户选片' },
  { stage: DELIVERY_STAGE.RETOUCHING, hint: '精修处理中' },
  { stage: DELIVERY_STAGE.PENDING_CONFIRM, hint: '等待客户确认成片' }
] as const

function laneRows(stage: number) {
  return rows.value.filter((d) => d.stage === stage)
}

const stats = computed(() => {
  const list = rows.value
  const pending = list.filter((d) => d.stage !== DELIVERY_STAGE.DELIVERED).length
  const selecting = list.filter((d) => d.stage === DELIVERY_STAGE.SELECTING)
  const retouching = list.filter((d) => d.stage === DELIVERY_STAGE.RETOUCHING)
  const confirming = list.filter((d) => d.stage === DELIVERY_STAGE.PENDING_CONFIRM).length
  return {
    pending,
    selectingCount: selecting.length,
    sampleTotal: selecting.reduce((sum, d) => sum + d.sample_count, 0),
    retouchingCount: retouching.length,
    confirming
  }
})

function progressOf(d: DeliveryListItem) {
  if (d.stage === DELIVERY_STAGE.RETOUCHING) {
    if (!d.retouch_target) return 0
    return Math.min(100, Math.round((d.retouched_count / d.retouch_target) * 100))
  }
  if (d.stage === DELIVERY_STAGE.SELECTING) {
    if (!d.sample_count) return 0
    return Math.min(100, Math.round((d.selected_count / d.sample_count) * 100))
  }
  if (d.stage === DELIVERY_STAGE.PENDING_CONFIRM) return 100
  return 0
}

/* ── 新建交付任务 ─────────────────────────────── */
const createOpen = ref(false)
const creating = ref(false)
const orders = ref<Order[]>([])
const users = ref<SysUser[]>([])

function emptyCreateForm() {
  return {
    order_id: 0,
    stage: DELIVERY_STAGE.PENDING_SAMPLES as number,
    operator_id: 0,
    raw_count: 0,
    retouch_target: 0,
    select_deadline: '',
    remark: ''
  }
}
const createForm = ref(emptyCreateForm())

async function openCreate() {
  createOpen.value = true
  if (!orders.value.length) {
    try {
      const res = await orderApi.listOrders({ page: 1, page_size: 200 })
      orders.value = res.list || []
    } catch (e) {
      toastErr(e instanceof Error ? e.message : '订单列表加载失败')
    }
  }
  if (!users.value.length) {
    try {
      const res = await membersApi.listUsers({ page: 1, page_size: 200 })
      users.value = res.list || []
    } catch {
      /* 负责人列表加载失败不阻断建单：可不指派 */
    }
  }
}

async function saveCreate() {
  if (!createForm.value.order_id) {
    toastErr('请选择订单')
    return
  }
  creating.value = true
  try {
    const d = await deliveryApi.createDelivery(createForm.value.order_id, {
      stage: createForm.value.stage,
      operator_id: createForm.value.operator_id || undefined,
      raw_count: createForm.value.raw_count || undefined,
      retouch_target: createForm.value.retouch_target || undefined,
      select_deadline: createForm.value.select_deadline || undefined,
      remark: createForm.value.remark || undefined
    })
    createOpen.value = false
    createForm.value = emptyCreateForm()
    await board.load()

    // 后端「同一订单只允许一张交付单」：若该订单已有交付单，create 会**原样返回旧单**而不新建。
    // 此时若旧单已到「已交付」(stage 5)，看板（只渲染 1-4）里根本看不到它 ——
    // 用户会以为"新增了却没数据"。这里显式区分三种结果，不留静默空档。
    const onBoard = rows.value.some((r) => r.id === d.id)
    if (onBoard) {
      toastOk('交付任务已创建')
    } else if (d.stage === DELIVERY_STAGE.DELIVERED) {
      toastOk('该订单的交付已完结（已交付），已为你打开「已交付」列表')
      router.push('/delivery/delivered')
    } else {
      toastErr(`该订单已有交付任务（第 ${d.stage} 阶段），但当前数据范围看不到它`)
    }
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

/* ── 批量上传（样片 / 精修成品）───────────────── */
const uploadOpen = ref(false)
const uploadTarget = ref<DeliveryListItem | null>(null)
const uploadKind = ref<'sample' | 'retouched'>('sample')
const uploadFilesBuf = ref<File[]>([])
const uploading = ref(false)

function openUpload(d: DeliveryListItem, kind: 'sample' | 'retouched') {
  uploadTarget.value = d
  uploadKind.value = kind
  uploadFilesBuf.value = []
  uploadOpen.value = true
}

function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  uploadFilesBuf.value = Array.from(input.files || [])
}

async function doUpload() {
  const d = uploadTarget.value
  if (!d) return
  if (!uploadFilesBuf.value.length) {
    toastErr('请选择文件')
    return
  }
  uploading.value = true
  try {
    const { results, errors } = await uploadFiles(uploadFilesBuf.value, 'order', d.order_id)
    if (!results.length) {
      toastErr(errors[0]?.message || '上传失败')
      return
    }
    const items = results.map((r) => ({
      // file_type 由服务端按 URL 后缀推导、kind 由调用的接口决定，前端不再上报
      url: r.url,
      filename: r.file_name,
      size: r.size
    }))
    if (uploadKind.value === 'sample') {
      await deliveryApi.uploadSamples(d.id, items)
    } else {
      await deliveryApi.uploadRetouched(d.id, items)
    }
    toastOk(
      errors.length
        ? `已上传 ${results.length} 个文件，${errors.length} 个失败`
        : `已上传 ${results.length} 个文件`
    )
    uploadOpen.value = false
    board.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '上传失败')
  } finally {
    uploading.value = false
  }
}

/* ── 提醒负责人 / 标记交付 ────────────────────── */
const busyId = ref(0)

async function remind(d: DeliveryListItem) {
  busyId.value = d.id
  try {
    await deliveryApi.remindDelivery(d.id)
    toastOk(d.operator_id ? '已提醒负责人' : '未指派负责人，已广播给全体成员')
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '提醒失败')
  } finally {
    busyId.value = 0
  }
}

async function confirmDelivered(d: DeliveryListItem) {
  busyId.value = d.id
  try {
    await deliveryApi.confirmDelivery(d.id)
    toastOk('已标记交付完成')
    board.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '操作失败')
  } finally {
    busyId.value = 0
  }
}
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>选片与精修</h1>
        <p>交付是体验的最后一公里，用一个工作流把它跑顺。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="board.load()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
        <!-- 已交付归档入口：看板只显示 stage 1-4，已交付(5)单独成页 -->
        <button class="btn btn-outline" @click="router.push('/delivery/delivered')">已交付</button>
        <button v-perm="'delivery:create'" class="btn btn-primary" @click="openCreate">+ 新建交付任务</button>
      </div>
    </div>

    <div v-if="board.error" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      交付数据加载失败：{{ board.error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="board.load()">重试</button>
    </div>

    <div class="stats-grid stats-4">
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-orange">件</span>待处理交付</div>
        <div class="stat-value">{{ stats.pending }}</div>
        <div class="stat-sub">含待上传 / 选片 / 精修 / 待确认</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-mint">选</span>客户待选片</div>
        <div class="stat-value">{{ stats.selectingCount }}</div>
        <div class="stat-sub">共 {{ stats.sampleTotal }} 张样片</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-lav">修</span>精修进行中</div>
        <div class="stat-value">{{ stats.retouchingCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-red">交</span>待确认交付</div>
        <div class="stat-value">{{ stats.confirming }}</div>
      </div>
    </div>

    <div class="board">
      <div v-for="lane in LANES" :key="lane.stage" class="lane">
        <div class="lane-head">
          <strong>{{ DELIVERY_STAGE_LABEL[lane.stage] }}</strong>
          <span class="pill">{{ laneRows(lane.stage).length }}</span>
        </div>
        <div class="lane-body">
          <div v-for="d in laneRows(lane.stage)" :key="d.id" class="task">
            <div class="task-title">
              {{ d.customer_name || '未命名客户' }} · {{ d.package_name || '未关联套餐' }}
            </div>
            <div class="task-meta">
              {{ d.order_code || `订单 #${d.order_id}` }}
              <template v-if="d.shoot_date"> · 拍摄 {{ formatDate(d.shoot_date) }}</template>
            </div>
            <div class="task-meta">
              <template v-if="d.stage === DELIVERY_STAGE.PENDING_SAMPLES">
                原片 {{ d.raw_count || 0 }} 张 · 待上传
              </template>
              <template v-else-if="d.stage === DELIVERY_STAGE.SELECTING">
                {{ d.sample_count }} 张样片 · 客户已选 {{ d.selected_count }} 张
              </template>
              <template v-else-if="d.stage === DELIVERY_STAGE.RETOUCHING">
                目标 {{ d.retouch_target || 0 }} 张 · 已完成 {{ d.retouched_count }} 张
              </template>
              <template v-else>
                V{{ d.retouch_version }} 精修成片 · 等待客户确认
              </template>
            </div>
            <div class="bar"><i :style="{ width: progressOf(d) + '%' }"></i></div>
            <div class="task-foot">
              <span v-if="d.select_deadline">截止 {{ formatDate(d.select_deadline) }}</span>
              <span v-else>负责人 {{ d.operator_id ? `#${d.operator_id}` : '未指派' }}</span>
              <span v-if="d.remark" class="muted" :title="d.remark">备注</span>
            </div>
            <div class="task-actions" v-perm="'delivery:update'">
              <button
                v-if="d.stage === DELIVERY_STAGE.PENDING_SAMPLES"
                class="btn btn-sm btn-primary"
                @click="openUpload(d, 'sample')"
              >
                上传样片
              </button>
              <button
                v-else-if="d.stage === DELIVERY_STAGE.RETOUCHING"
                class="btn btn-sm btn-primary"
                @click="openUpload(d, 'retouched')"
              >
                上传成片
              </button>
              <button
                v-else-if="d.stage === DELIVERY_STAGE.PENDING_CONFIRM"
                class="btn btn-sm btn-primary"
                :disabled="busyId === d.id"
                @click="confirmDelivered(d)"
              >
                标记交付
              </button>
              <button class="btn btn-sm btn-outline" :disabled="busyId === d.id" @click="remind(d)">
                提醒负责人
              </button>
            </div>
          </div>
          <div v-if="!laneRows(lane.stage).length" class="lane-empty">{{ lane.hint }}：暂无任务</div>
        </div>
      </div>
    </div>

    <!-- 新建交付任务 -->
    <BaseModal :open="createOpen" title="新建交付任务" @close="createOpen = false">
      <form id="delivery-form" class="form-grid" @submit.prevent="saveCreate">
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label"><span class="req">*</span> 选择订单</label>
          <select v-model.number="createForm.order_id" class="select">
            <option :value="0" disabled>请选择订单</option>
            <option v-for="o in orders" :key="o.id" :value="o.id">
              {{ o.code }} · {{ o.customer_name }} · {{ o.package_name }}
            </option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">起始阶段</label>
          <select v-model.number="createForm.stage" class="select">
            <option :value="DELIVERY_STAGE.PENDING_SAMPLES">待上传样片</option>
            <option :value="DELIVERY_STAGE.SELECTING">客户选片中</option>
            <option :value="DELIVERY_STAGE.RETOUCHING">精修进行中</option>
            <option :value="DELIVERY_STAGE.PENDING_CONFIRM">待确认交付</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">负责人</label>
          <select v-model.number="createForm.operator_id" class="select">
            <option :value="0">暂不指派</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nickname || u.username }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">原片数量</label>
          <input v-model.number="createForm.raw_count" class="input" type="number" min="0" />
        </div>
        <div class="field">
          <label class="field-label">计划精修张数</label>
          <input v-model.number="createForm.retouch_target" class="input" type="number" min="0" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">选片截止时间</label>
          <input v-model="createForm.select_deadline" class="input" type="datetime-local" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">备注</label>
          <textarea v-model="createForm.remark" class="textarea"></textarea>
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="createOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="delivery-form" :disabled="creating">
          {{ creating ? '创建中…' : '创建交付任务' }}
        </button>
      </template>
    </BaseModal>

    <!-- 批量上传 -->
    <BaseModal
      :open="uploadOpen"
      :title="uploadKind === 'sample' ? '批量上传样片' : '批量上传精修成片'"
      @close="uploadOpen = false"
    >
      <div v-if="uploadTarget" class="upload-body">
        <div class="upload-row">
          <span class="muted small">交付单</span>
          <b>{{ uploadTarget.code }}</b>
        </div>
        <div class="upload-row">
          <span class="muted small">客户</span>
          <b>{{ uploadTarget.customer_name }}</b>
        </div>
        <div class="field mt-16">
          <label class="field-label">选择文件（可多选）</label>
          <input class="input" type="file" multiple accept="image/*,video/*" @change="onPickFiles" />
        </div>
        <p class="muted small mt-8">已选 {{ uploadFilesBuf.length }} 个文件，上传后自动归入交付明细。</p>
      </div>
      <template #foot>
        <button class="btn btn-ghost" @click="uploadOpen = false">取消</button>
        <button class="btn btn-primary" :disabled="uploading" @click="doUpload">
          {{ uploading ? '上传中…' : '开始上传' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

@media (max-width: 1100px) {
  .board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .board {
    grid-template-columns: 1fr;
  }
}

.lane {
  background: var(--cream);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.lane-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 11px 12px;
}

.task-title {
  font-size: 12px;
  font-weight: 700;
}

.task-meta {
  font-size: 10px;
  color: var(--muted);
  margin-top: 4px;
}

.bar {
  height: 5px;
  border-radius: 3px;
  background: var(--line);
  margin: 8px 0 6px;
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  background: var(--mint-dark, #4f9d78);
}

.task-foot {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--muted);
}

.task-actions {
  display: flex;
  gap: 6px;
  margin-top: 9px;
  flex-wrap: wrap;
}

.lane-empty {
  font-size: 11px;
  color: var(--muted);
  border: 1px dashed var(--line-2);
  border-radius: 10px;
  padding: 14px 10px;
  text-align: center;
}

.upload-body {
  display: flex;
  flex-direction: column;
}

.upload-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 12px;
}
</style>
