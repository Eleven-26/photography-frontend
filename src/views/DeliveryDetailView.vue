<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import BaseModal from '@/components/BaseModal.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import * as deliveryApi from '@/api/delivery'
import { uploadFiles } from '@/api/upload'
import { formatDate, formatDateTime, money } from '@/utils/format'
import type { Delivery, DeliveryItem } from '@/types'
import { DELIVERY_STAGE, DELIVERY_STAGE_LABEL } from '@/types'

/**
 * 交付详情页（选片 / 精修 / 交付的全过程）。
 *
 * 路由 `/delivery/detail/:orderId`，参数是**订单 ID** —— 与 `delivery/detail`、
 * `delivery/items` 两个接口的语义一致（按订单反查交付单，见 api/delivery.ts 顶部注释）。
 * 而「上传 / 提醒 / 标记交付」这几条接口按**交付单主键**查，故此处用 `delivery.id`：
 * 两套 ID 混用会直接 40400「交付单不存在」。
 *
 * 列表信息（订单编号 / 套餐 / 拍摄日期）由看板卡片通过 query 透传，避免为页头多打一次订单详情接口；
 * 直接打开链接（无 query）时降级显示订单 ID，功能不受影响。
 */
const route = useRoute()
const router = useRouter()

const orderId = computed(() => Number(route.params.orderId) || 0)

const delivery = ref<Delivery | null>(null)
const items = ref<DeliveryItem[]>([])
const loading = ref(false)
const error = ref('')
/** 订单尚未创建交付单（detail 接口会失败，非异常，需给空态而非报错） */
const noDelivery = ref(false)

async function load() {
  if (!orderId.value) {
    error.value = '缺少订单参数，无法加载交付详情'
    return
  }
  loading.value = true
  error.value = ''
  noDelivery.value = false
  // 两个接口并发：items 在交付单不存在时返回空数组而非报错，故各自独立成败
  const [detailRes, itemsRes] = await Promise.allSettled([
    deliveryApi.deliveryDetail(orderId.value),
    deliveryApi.deliveryItems(orderId.value)
  ])
  if (detailRes.status === 'fulfilled') {
    delivery.value = detailRes.value
  } else {
    delivery.value = null
    noDelivery.value = true
    error.value = detailRes.reason instanceof Error ? detailRes.reason.message : '交付单加载失败'
  }
  items.value = itemsRes.status === 'fulfilled' ? itemsRes.value || [] : []
  loading.value = false
}

/** 看板透传的订单快照（可缺省） */
const qCode = computed(() => String(route.query.order_code || ''))
const qPackage = computed(() => String(route.query.package_name || ''))
const qShoot = computed(() => String(route.query.shoot_date || ''))
const qCustomer = computed(() => String(route.query.customer_name || ''))

const customerName = computed(() => delivery.value?.customer_name || qCustomer.value || '未命名客户')
const orderLabel = computed(() => qCode.value || (delivery.value ? `订单 #${delivery.value.order_id}` : '—'))

const stage = computed(() => delivery.value?.stage || 0)
const stageLabel = computed(() => DELIVERY_STAGE_LABEL[stage.value] || '—')

/** 阶段进度（与看板同口径：选片看已选/样片，精修看已完成/目标，待确认=100） */
const progress = computed(() => {
  const d = delivery.value
  if (!d) return 0
  if (d.stage === DELIVERY_STAGE.RETOUCHING) {
    if (!d.retouch_target) return 0
    return Math.min(100, Math.round((d.retouched_count / d.retouch_target) * 100))
  }
  if (d.stage === DELIVERY_STAGE.SELECTING) {
    if (!d.sample_count) return 0
    return Math.min(100, Math.round((d.selected_count / d.sample_count) * 100))
  }
  if (d.stage === DELIVERY_STAGE.PENDING_CONFIRM || d.stage === DELIVERY_STAGE.DELIVERED) return 100
  return 0
})

/* ── 明细按 kind 分组（1-样片 2-已选 3-精修成品）── */
const KINDS = [
  { kind: 1, label: '样片', hint: '工作室上传，供客户挑选' },
  { kind: 2, label: '客户已选', hint: '客户勾选确认，进入精修' },
  { kind: 3, label: '精修成品', hint: '精修完成，等待客户确认交付' }
] as const

const isImage = (f: DeliveryItem) =>
  f.file_type === 1 || /\.(jpe?g|png|gif|webp|bmp|avif|heic)$/i.test(f.url || '')

const grouped = computed(() =>
  KINDS.map((k) => {
    const list = items.value.filter((i) => i.kind === k.kind)
    return { ...k, items: list, images: list.filter(isImage), files: list.filter((i) => !isImage(i)) }
  })
)

function humanSize(n?: number) {
  if (!n || n <= 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/* ── 大图预览（多图左右切换，支持 Esc / ← →）── */
const previewList = ref<DeliveryItem[]>([])
const previewIndex = ref(-1)
const previewUrl = computed(() => previewList.value[previewIndex.value]?.url || '')

function openPreview(images: DeliveryItem[], target: DeliveryItem) {
  const idx = images.findIndex((i) => i.id === target.id)
  if (idx < 0) return
  previewList.value = images
  previewIndex.value = idx
}

function closePreview() {
  previewList.value = []
  previewIndex.value = -1
}

const prev = () => {
  if (previewIndex.value > 0) previewIndex.value--
}
const next = () => {
  if (previewIndex.value < previewList.value.length - 1) previewIndex.value++
}

function onKey(e: KeyboardEvent) {
  if (!previewUrl.value) return
  if (e.key === 'Escape') closePreview()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}

onMounted(() => {
  void load()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* ── 上传（样片 / 精修成品）── */
const uploadOpen = ref(false)
const uploadKind = ref<'sample' | 'retouched'>('sample')
const uploadBuf = ref<File[]>([])
const uploading = ref(false)

function openUpload(kind: 'sample' | 'retouched') {
  uploadKind.value = kind
  uploadBuf.value = []
  uploadOpen.value = true
}

function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  uploadBuf.value = Array.from(input.files || [])
}

async function doUpload() {
  const d = delivery.value
  if (!d) return
  if (!uploadBuf.value.length) {
    toastErr('请选择文件')
    return
  }
  uploading.value = true
  try {
    const { results, errors } = await uploadFiles(uploadBuf.value, 'order', d.order_id)
    if (!results.length) {
      toastErr(errors[0]?.message || '上传失败')
      return
    }
    // file_type 由服务端按 URL 后缀推导，kind 由调用的接口决定，前端不上报
    const payload = results.map((r) => ({ url: r.url, filename: r.file_name, size: r.size }))
    if (uploadKind.value === 'sample') await deliveryApi.uploadSamples(d.id, payload)
    else await deliveryApi.uploadRetouched(d.id, payload)
    toastOk(
      errors.length ? `已上传 ${results.length} 个，${errors.length} 个失败` : `已上传 ${results.length} 个文件`
    )
    uploadOpen.value = false
    await load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '上传失败')
  } finally {
    uploading.value = false
  }
}

/* ── 提醒负责人 / 标记交付 ── */
const busy = ref(false)

async function remind() {
  const d = delivery.value
  if (!d) return
  busy.value = true
  try {
    await deliveryApi.remindDelivery(d.id)
    toastOk(d.operator_id ? '已提醒负责人' : '未指派负责人，已广播给全体成员')
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '提醒失败')
  } finally {
    busy.value = false
  }
}

async function confirmDelivered() {
  const d = delivery.value
  if (!d) return
  busy.value = true
  try {
    await deliveryApi.confirmDelivery(d.id)
    toastOk('已标记交付完成，已归档到「已交付」')
    await load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '操作失败')
  } finally {
    busy.value = false
  }
}

function goBoard() {
  router.push('/delivery')
}
function goOrder() {
  if (!orderId.value) return
  router.push({ path: '/orders', query: { id: String(orderId.value) } })
}
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>交付详情</h1>
        <p>样片、客户选片、精修成品与交付进度，一处看全。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="goBoard">
          <svg class="icon" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
          返回看板
        </button>
        <button class="btn btn-outline" @click="load()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
        <button v-if="delivery" class="btn btn-outline" @click="goOrder">查看订单</button>
        <button
          v-if="delivery && stage === DELIVERY_STAGE.PENDING_SAMPLES"
          v-perm="'delivery:update'"
          class="btn btn-primary"
          @click="openUpload('sample')"
        >
          上传样片
        </button>
        <button
          v-else-if="delivery && stage === DELIVERY_STAGE.RETOUCHING"
          v-perm="'delivery:update'"
          class="btn btn-primary"
          @click="openUpload('retouched')"
        >
          上传成片
        </button>
        <button
          v-else-if="delivery && stage === DELIVERY_STAGE.PENDING_CONFIRM"
          v-perm="'delivery:update'"
          class="btn btn-primary"
          :disabled="busy"
          @click="confirmDelivered"
        >
          标记交付
        </button>
      </div>
    </div>

    <div v-if="error && !noDelivery" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      交付详情加载失败：{{ error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="load()">重试</button>
    </div>

    <div v-if="loading && !delivery" class="card card-pad" style="margin-top: 16px">
      <div class="empty-state"><strong>加载中…</strong></div>
    </div>

    <!-- 订单还没有交付单：不是错误，引导到看板建单 -->
    <div v-else-if="noDelivery" class="card card-pad" style="margin-top: 16px">
      <div class="empty-state">
        <strong>该订单还没有交付任务</strong>
        <p>在「选片与精修」看板点「+ 新建交付任务」选中本订单即可开始上传样片。</p>
        <button class="btn btn-sm btn-primary mt-8" @click="goBoard">去建交付任务</button>
      </div>
    </div>

    <template v-else-if="delivery">
      <!-- 交付单概要 -->
      <div class="card card-pad dd-head">
        <div class="dd-head-top">
          <div>
            <div class="dd-code">{{ delivery.code }}</div>
            <div class="dd-title">{{ customerName }}<span v-if="qPackage"> · {{ qPackage }}</span></div>
          </div>
          <span class="pill status-info">{{ stageLabel }}</span>
        </div>
        <div class="dd-meta">
          <div class="dd-meta-item">
            <span class="muted xsmall">关联订单</span>
            <b>{{ orderLabel }}</b>
          </div>
          <div class="dd-meta-item">
            <span class="muted xsmall">拍摄日期</span>
            <b>{{ qShoot ? formatDate(qShoot) : '—' }}</b>
          </div>
          <div class="dd-meta-item">
            <span class="muted xsmall">负责人</span>
            <b>{{ delivery.operator_id ? `#${delivery.operator_id}` : '未指派' }}</b>
          </div>
          <div class="dd-meta-item">
            <span class="muted xsmall">选片截止</span>
            <b>{{ delivery.select_deadline ? formatDate(delivery.select_deadline) : '—' }}</b>
          </div>
          <div class="dd-meta-item">
            <span class="muted xsmall">精修版本</span>
            <b>V{{ delivery.retouch_version }}</b>
          </div>
          <div class="dd-meta-item">
            <span class="muted xsmall">交付时间</span>
            <b>{{ delivery.delivered_at ? formatDate(delivery.delivered_at) : '—' }}</b>
          </div>
        </div>
        <div v-if="delivery.remark" class="dd-remark">
          <span class="muted xsmall">备注</span>
          <span>{{ delivery.remark }}</span>
        </div>
        <div class="bar"><i :style="{ width: progress + '%' }"></i></div>
        <div class="dd-progress">
          <span class="muted xsmall">整体进度 {{ progress }}%</span>
          <span v-if="delivery.selected_at" class="muted xsmall">
            客户选片于 {{ formatDateTime(delivery.selected_at) }}
          </span>
        </div>
      </div>

      <div class="stats-grid stats-4">
        <div class="stat-card">
          <div class="stat-head"><span class="stat-icon tone-mint">样</span>样片</div>
          <div class="stat-value">{{ delivery.sample_count }}</div>
          <div class="stat-sub">已上传供客户挑选</div>
        </div>
        <div class="stat-card">
          <div class="stat-head"><span class="stat-icon tone-orange">选</span>客户已选</div>
          <div class="stat-value">{{ delivery.selected_count }}</div>
          <div class="stat-sub">
            <template v-if="delivery.extra_selected_count">
              超选 {{ delivery.extra_selected_count }} 张 · 加收 {{ money(delivery.extra_fee) }}
            </template>
            <template v-else>计划精修 {{ delivery.retouch_target || 0 }} 张</template>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-head"><span class="stat-icon tone-lav">修</span>精修成品</div>
          <div class="stat-value">{{ delivery.retouched_count }}</div>
          <div class="stat-sub">原片 {{ delivery.raw_count || 0 }} 张</div>
        </div>
        <div class="stat-card">
          <div class="stat-head"><span class="stat-icon tone-red">进</span>当前阶段</div>
          <div class="stat-value" style="font-size: 18px">{{ stageLabel }}</div>
          <div class="stat-sub">{{ items.length }} 个交付文件</div>
        </div>
      </div>

      <!-- 明细分栏 -->
      <div v-for="g in grouped" :key="g.kind" class="card card-pad dd-sec">
        <div class="section-title" style="margin-top: 0">
          <h2>{{ g.label }}</h2>
          <span>{{ g.items.length }} 个</span>
        </div>
        <p class="dd-hint">{{ g.hint }}</p>

        <div v-if="g.images.length" class="dd-grid">
          <button
            v-for="f in g.images"
            :key="f.id"
            class="dd-cell"
            :style="{ backgroundImage: `url(${f.url})` }"
            :title="f.filename || f.url"
            @click="openPreview(g.images, f)"
          >
            <span v-if="f.is_selected" class="dd-badge status-ok">已选</span>
            <span v-if="f.feedback_status === 1" class="dd-badge dd-badge--corner status-pending">反馈</span>
          </button>
        </div>

        <div v-if="g.files.length" class="dd-files">
          <a
            v-for="f in g.files"
            :key="f.id"
            class="dd-file-row"
            :href="f.url"
            target="_blank"
            rel="noopener"
          >
            <span class="pill status-info">{{ g.label }}</span>
            <span class="cell-main">{{ f.filename || f.url }}</span>
            <span class="cell-sub">{{ humanSize(f.size) }}</span>
            <span v-if="f.is_selected" class="pill status-ok">已选</span>
          </a>
        </div>

        <div v-if="!g.items.length" class="dd-empty">暂无{{ g.label }}</div>

        <!-- 反馈信息（若有） -->
        <div v-if="g.items.some((i) => i.feedback_status)" class="dd-feedback">
          <div v-for="i in g.items.filter((x) => x.feedback_status)" :key="'fb' + i.id" class="dd-fb-row">
            <span class="pill" :class="i.feedback_status === 2 ? 'status-ok' : 'status-pending'">
              {{ i.feedback_status === 2 ? '已处理' : '待处理' }}
            </span>
            <span class="cell-main">{{ i.filename || i.url }}</span>
            <span class="cell-sub">
              {{ i.feedback_types || '未分类' }}{{ i.feedback_priority ? ` · ${i.feedback_priority}` : '' }}
              <template v-if="i.feedback_content"> · {{ i.feedback_content }}</template>
              <template v-if="i.handled_at"> · 处理于 {{ formatDateTime(i.handled_at) }}</template>
              <template v-if="i.handle_remark"> · 回复：{{ i.handle_remark }}</template>
            </span>
          </div>
        </div>
      </div>

      <div class="dd-actions">
        <button v-perm="'delivery:update'" class="btn btn-outline" :disabled="busy" @click="remind">
          提醒负责人
        </button>
        <button class="btn btn-ghost" @click="goOrder">查看关联订单</button>
      </div>
    </template>

    <!-- 大图预览 -->
    <div v-if="previewUrl" class="pv-mask" @click.self="closePreview">
      <div class="pv-bar">
        <span class="pv-count">{{ previewIndex + 1 }} / {{ previewList.length }}</span>
        <span class="pv-name">{{ previewList[previewIndex]?.filename || '' }}</span>
        <a class="btn btn-sm btn-outline" :href="previewUrl" target="_blank" rel="noopener">查看原图</a>
        <button class="pv-close" @click="closePreview">×</button>
      </div>
      <button class="pv-nav pv-nav--prev" :disabled="previewIndex <= 0" @click.stop="prev">‹</button>
      <img class="pv-img" :src="previewUrl" :alt="previewList[previewIndex]?.filename || '预览'" />
      <button
        class="pv-nav pv-nav--next"
        :disabled="previewIndex >= previewList.length - 1"
        @click.stop="next"
      >
        ›
      </button>
    </div>

    <!-- 上传（样片 / 精修成品） -->
    <BaseModal
      :open="uploadOpen"
      :title="uploadKind === 'sample' ? '批量上传样片' : '批量上传精修成片'"
      @close="uploadOpen = false"
    >
      <div v-if="delivery" class="up-body">
        <div class="up-row"><span class="muted small">交付单</span><b>{{ delivery.code }}</b></div>
        <div class="up-row"><span class="muted small">客户</span><b>{{ customerName }}</b></div>
        <div class="field mt-16">
          <label class="field-label">选择文件（可多选）</label>
          <input class="input" type="file" multiple accept="image/*,video/*" @change="onPickFiles" />
        </div>
        <p class="muted small mt-8">已选 {{ uploadBuf.length }} 个文件，上传后自动归入交付明细。</p>
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
.dd-head {
  margin-top: 16px;
}

.dd-head-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dd-code {
  font-family: var(--serif, Georgia, serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}

.dd-title {
  font-size: 12px;
  color: var(--muted);
  margin-top: 3px;
}

.dd-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 18px;
  margin-top: 16px;
}

@media (max-width: 900px) {
  .dd-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.dd-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.dd-remark {
  margin-top: 12px;
  padding: 9px 12px;
  background: #fbfaf6;
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bar {
  height: 6px;
  border-radius: 3px;
  background: var(--line);
  margin: 16px 0 6px;
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  background: var(--mint-dark, #4f9d78);
  transition: width 0.25s ease;
}

.dd-progress {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.dd-sec {
  margin-top: 16px;
}

.dd-hint {
  font-size: 11px;
  color: var(--muted);
  margin: -6px 0 12px;
}

.dd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
}

.dd-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--line);
  border-radius: 10px;
  background-color: #f2efe7;
  background-size: cover;
  background-position: center;
  cursor: zoom-in;
  padding: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.dd-cell:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.dd-badge {
  position: absolute;
  top: 6px;
  left: 6px;
}

.dd-badge--corner {
  left: auto;
  right: 6px;
}

.dd-files {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.dd-file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  font-size: 12px;
}

.dd-file-row:hover {
  background: #fdfaf3;
}

.dd-empty {
  padding: 22px;
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  border: 1px dashed var(--line-2, var(--line));
  border-radius: 10px;
}

.dd-feedback {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px dashed var(--line);
  padding-top: 12px;
}

.dd-fb-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
}

.dd-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 18px;
}

/* ── 大图预览 ── */
.pv-mask {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(10, 15, 17, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pv-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  color: #fff;
  font-size: 12px;
}

.pv-count {
  font-weight: 700;
}

.pv-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.75;
}

.pv-close {
  background: transparent;
  border: 0;
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0 6px;
}

.pv-img {
  max-width: 90vw;
  max-height: 84vh;
  object-fit: contain;
  border-radius: 6px;
}

.pv-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.12);
  border: 0;
  color: #fff;
  font-size: 30px;
  line-height: 1;
  width: 46px;
  height: 66px;
  border-radius: 8px;
  cursor: pointer;
}

.pv-nav:disabled {
  opacity: 0.25;
  cursor: default;
}

.pv-nav--prev {
  left: 18px;
}

.pv-nav--next {
  right: 18px;
}

.up-body {
  display: flex;
  flex-direction: column;
}

.up-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 12px;
}
</style>
