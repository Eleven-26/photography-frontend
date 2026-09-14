<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppToast from '@/components/AppToast.vue'
import BaseModal from '@/components/BaseModal.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import { useFetch } from '@/composables/useFetch'
import { useStudioSetting } from '@/composables/useStudioSetting'
import * as assetApi from '@/api/assets'
import { listPackages } from '@/api/packages'
import { uploadFiles } from '@/api/upload'
import { ASSET_STATUS, ASSET_VISIBILITY, ASSET_AUTH } from '@/types'
import type { Asset, Package } from '@/types'
import { formatDate } from '@/utils/format'

/* ── 列表 ─────────────────────────────────────── */
const filter = reactive({
  keyword: '',
  category: '',
  /** '' 全部 / '1' 仅精选 */
  featured: '' as '' | '1',
  page: 1,
  page_size: 60
})

const page = useFetch(() => assetApi.listAssets({ ...filter }))
const works = computed(() => page.data?.list || [])

const categories = computed(() => {
  const set = new Set(works.value.map((w) => w.category).filter(Boolean))
  return Array.from(set)
})

const stat = computed(() => ({
  total: page.data?.total || 0,
  featured: works.value.filter((w) => w.featured === 1).length,
  publicCount: works.value.filter((w) => w.visibility === ASSET_VISIBILITY.PUBLIC).length,
  privateCount: works.value.filter((w) => w.visibility === ASSET_VISIBILITY.PRIVATE).length
}))

function search() {
  filter.page = 1
  page.load()
}

function setCategory(c: string) {
  filter.category = c
  search()
}

function setFeatured(f: '' | '1') {
  filter.featured = f
  search()
}

/* ── 套餐映射（关联套餐名称展示 + 表单选择）──────── */
const packages = ref<Package[]>([])
const packageMap = computed(() => {
  const m: Record<number, Package> = {}
  packages.value.forEach((p) => (m[p.id] = p))
  return m
})

async function loadPackages() {
  if (packages.value.length) return
  try {
    const res = await listPackages({ page: 1, page_size: 200 })
    packages.value = res.list || []
  } catch {
    packages.value = []
  }
}
void loadPackages()

function firstPackageName(w: Asset) {
  const ids = (w.package_ids || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter(Boolean)
  if (!ids.length) return '未关联套餐'
  return packageMap.value[ids[0]]?.name || `套餐 #${ids[0]}`
}

/** images 后端为逗号分隔串，图片数量按此推导 */
function imageCount(w: Asset) {
  return (w.images || '').split(',').filter((s) => s.trim()).length
}

/**
 * 是否可直接渲染的图片地址。
 * 既有外链（http/https），也有后端上传返回的**站内相对路径** —— /media/…（公开作品图）
 * 与 /uploads/…（历史数据）。旧实现只认 `//` 开头的外链，导致上传后的相对路径一律
 * 退化成正占位底纹，看起来像"上传没生效"。
 */
const isImageUrl = (u?: string) => !!u && (/^(https?:)?\/\//.test(u) || u.startsWith('/'))

const coverStyle = (w: Asset) =>
  isImageUrl(w.cover)
    ? { backgroundImage: `url(${w.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(160deg,#e7e2d8,#c9c2b4)' }

/* ── 单个开关 / 批量操作 ────────────────────────── */
const busy = ref(false)

async function toggleFlag(w: Asset, patch: { featured?: number; visibility?: number }) {
  if (busy.value) return
  busy.value = true
  try {
    await assetApi.setAssetFlags(w.id, patch)
    await page.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '操作失败')
  } finally {
    busy.value = false
  }
}

const selected = ref<number[]>([])
const allSelected = computed(() => works.value.length > 0 && selected.value.length === works.value.length)

function toggleSelect(id: number) {
  const i = selected.value.indexOf(id)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(id)
}

function toggleSelectAll() {
  selected.value = allSelected.value ? [] : works.value.map((w) => w.id)
}

async function batchSet(patch: { featured?: number; visibility?: number; status?: number }) {
  if (!selected.value.length) return
  busy.value = true
  const ids = [...selected.value]
  let failed = 0
  await Promise.all(
    ids.map(async (id) => {
      try {
        await assetApi.setAssetFlags(id, patch)
      } catch {
        failed++
      }
    })
  )
  busy.value = false
  selected.value = []
  await page.load()
  if (failed) toastErr(`${failed} 件作品更新失败`)
  else toastOk('批量更新完成')
}

/* ── 新增 / 编辑 ───────────────────────────────── */
const workOpen = ref(false)
const workSaving = ref(false)
const editingId = ref<number | null>(null)

const workForm = reactive({
  title: '',
  category: '家庭写真',
  cover: '',
  images: '',
  description: '',
  photographer: '',
  model: '',
  location: '',
  shoot_date: '',
  package_id: 0,
  visibility: ASSET_VISIBILITY.PUBLIC as number,
  featured: 0,
  authorization: ASSET_AUTH.GRANTED as number,
  status: ASSET_STATUS.DRAFT as number
})

const categoryOptions = ['家庭写真', '商务肖像', '婚礼跟拍', '证件照', '自然人像', '亲子写真', '活动跟拍']

function openCreate() {
  editingId.value = null
  Object.assign(workForm, {
    title: '',
    category: '家庭写真',
    cover: '',
    images: '',
    description: '',
    photographer: '',
    model: '',
    location: '',
    shoot_date: '',
    package_id: 0,
    visibility: ASSET_VISIBILITY.PUBLIC,
    featured: 0,
    authorization: ASSET_AUTH.GRANTED,
    status: ASSET_STATUS.DRAFT
  })
  workOpen.value = true
}

function openEdit(w: Asset) {
  editingId.value = w.id
  Object.assign(workForm, {
    title: w.title,
    category: w.category || '家庭写真',
    cover: w.cover || '',
    images: w.images || '',
    description: w.description || '',
    photographer: w.photographer || '',
    model: w.model || '',
    location: w.location || '',
    shoot_date: w.shoot_date || '',
    package_id: Number((w.package_ids || '').split(',')[0]) || 0,
    visibility: w.visibility || ASSET_VISIBILITY.PUBLIC,
    featured: w.featured || 0,
    authorization: w.authorization || ASSET_AUTH.GRANTED,
    status: w.status || ASSET_STATUS.DRAFT
  })
  workOpen.value = true
}

async function saveWork() {
  if (!workForm.title.trim()) {
    toastErr('请填写作品标题')
    return
  }
  workSaving.value = true
  try {
    const payload = {
      title: workForm.title,
      category: workForm.category,
      cover: workForm.cover,
      images: workForm.images,
      description: workForm.description,
      photographer: workForm.photographer,
      model: workForm.model,
      location: workForm.location,
      shoot_date: workForm.shoot_date,
      package_ids: workForm.package_id ? String(workForm.package_id) : '',
      visibility: workForm.visibility,
      featured: workForm.featured,
      authorization: workForm.authorization,
      status: workForm.status
    }
    if (editingId.value) {
      await assetApi.updateAsset(editingId.value, payload as Partial<Asset>)
    } else {
      await assetApi.createAsset(payload as Partial<Asset>)
    }
    workOpen.value = false
    toastOk(editingId.value ? '作品已更新' : '作品已创建')
    await page.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '保存失败')
  } finally {
    workSaving.value = false
  }
}

async function removeWork(w: Asset) {
  if (!window.confirm(`确认删除作品「${w.title}」？该操作不可恢复。`)) return
  busy.value = true
  try {
    await assetApi.deleteAsset(w.id)
    toastOk('已删除')
    await page.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '删除失败')
  } finally {
    busy.value = false
  }
}

/* ── 图片上传（落公开媒体目录 /media）────────────── */
// 作品集是对外宣传物料，而 H5 分享页的浏览者通常**未登录**：
// 上传必须带 public=1 让后端落免鉴权的 /media 目录，否则图片在 H5 上会整片 401。
const uploadingCover = ref(false)
const uploadingImages = ref(false)
const coverInput = ref<HTMLInputElement | null>(null)
const imagesInput = ref<HTMLInputElement | null>(null)

/** images 后端是逗号分隔串，页内以数组形态增删 */
const imageList = computed(() =>
  (workForm.images || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
)

function setImageList(list: string[]) {
  workForm.images = list.join(',')
  // 封面为空时用第一张兜底：封面留空会让列表卡片退化成占位底纹
  if (!workForm.cover && list.length) workForm.cover = list[0]
}

function openPicker(input: HTMLInputElement | null) {
  input?.click()
}

async function onPickCover(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = '' // 复位，保证连续选同一文件也能触发 change
  if (!files.length) return
  uploadingCover.value = true
  try {
    const { results, errors } = await uploadFiles(files.slice(0, 1), 'asset', 0, true)
    if (!results.length) {
      toastErr(errors[0]?.message || '封面上传失败')
      return
    }
    workForm.cover = results[0].url
    toastOk('封面已上传')
  } finally {
    uploadingCover.value = false
  }
}

async function onPickImages(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  uploadingImages.value = true
  try {
    const { results, errors } = await uploadFiles(files, 'asset', 0, true)
    if (!results.length) {
      toastErr(errors[0]?.message || '图片上传失败')
      return
    }
    setImageList([...imageList.value, ...results.map((r) => r.url)])
    toastOk(
      errors.length
        ? `已上传 ${results.length} 张，${errors.length} 张失败`
        : `已上传 ${results.length} 张`
    )
  } finally {
    uploadingImages.value = false
  }
}

function removeImage(url: string) {
  setImageList(imageList.value.filter((u) => u !== url))
  // 删掉的正好是封面时，顺延到剩余第一张（避免封面指向已移除的图）
  if (workForm.cover === url) workForm.cover = imageList.value[0] || ''
}

/* ── 分享 ─────────────────────────────────────── */
async function copyLink(text: string, tip: string) {
  try {
    await navigator.clipboard.writeText(text)
    toastOk(tip)
  } catch {
    toastErr(`复制失败，链接：${text}`)
  }
}

// 分享地址由**后端下发**（studio/get 的 portfolio_url = share.h5_base_url + slug
// + H5 的 hash 路由），前端不自行拼域名：改域名只需改 Nacos 配置，无需前端发版。
// 旧实现拼的是 `window.location.origin + '/h5/portfolio'` —— 那是 PC 后台自己的域名，
// 且 PC 端根本没有这个路由，复制出去的链接必然打不开。
const { setting: studioSetting, load: loadStudioSetting } = useStudioSetting()
void loadStudioSetting()

function sharePortfolio() {
  const url = studioSetting.value?.portfolio_url
  if (!url) {
    void loadStudioSetting() // 可能是首轮加载失败（或设置页刚改完 slug），顺手补一次
    toastErr('暂无可分享地址：请先在「设置 · 预约主页短链标识」填写工作室标识')
    return
  }
  void copyLink(url, '作品集分享链接已复制')
}

/**
 * 单件作品的「分享」：H5 客户端目前只有作品集列表页（pages/works/index），
 * 没有单作品详情页，故沿用作品集链接 —— 客户点开能看到全部作品（含该件）。
 * 待 H5 增加作品详情页后，这里改为带作品 id 的 deep link。
 */
const shareWork = () => sharePortfolio()
</script>

<template>
  <div>
    <AppToast />

    <div class="page-head">
      <div>
        <h1>作品集</h1>
        <p>管理精选作品、公开状态与套餐关联，决定客户在 H5 里看到什么。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="sharePortfolio">
          <svg class="icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
          分享作品集
        </button>
        <button v-perm="'asset:upload'" class="btn btn-primary" @click="openCreate">+ 上传作品</button>
      </div>
    </div>

    <div v-if="page.error" class="data-source-tip error">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      作品加载失败：{{ page.error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="page.load()">重试</button>
    </div>

    <div class="stats-grid stats-4" style="margin-bottom: 18px">
      <div class="stat-card">
        <div class="stat-head"><span>作品组</span></div>
        <div class="stat-value">{{ stat.total }}</div>
        <div class="stat-sub">共 {{ works.length }} 组当前展示</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span>精选作品</span></div>
        <div class="stat-value">{{ stat.featured }}</div>
        <div class="stat-sub">展示在客户主页顶部</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span>公开作品</span></div>
        <div class="stat-value">{{ stat.publicCount }}</div>
        <div class="stat-sub">客户可见</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span>未公开</span></div>
        <div class="stat-value">{{ stat.privateCount }}</div>
        <div class="stat-sub">仅工作室内部可见</div>
      </div>
    </div>

    <div class="pf-toolbar">
      <button class="tab-chip" :class="{ active: filter.featured === '' && !filter.category }" @click="setCategory('')">全部</button>
      <button class="tab-chip" :class="{ active: filter.featured === '1' }" @click="setFeatured('1')">精选</button>
      <button
        v-for="c in categories"
        :key="c"
        class="tab-chip"
        :class="{ active: filter.category === c }"
        @click="setCategory(c)"
      >
        {{ c }}
      </button>
      <div class="search-input" style="margin-left: auto; min-width: 220px">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input v-model="filter.keyword" class="input" placeholder="搜索作品标题 / 编号" @keyup.enter="search" />
      </div>
      <button class="btn btn-outline" @click="search">查询</button>
    </div>

    <!-- 批量操作条（精选/公开均属发布审核动作 → asset:audit） -->
    <div v-if="selected.length" v-perm="'asset:audit'" class="batch-bar">
      <span>已选 {{ selected.length }} 件</span>
      <button class="btn btn-sm btn-outline" :disabled="busy" @click="batchSet({ featured: 1 })">设为精选</button>
      <button class="btn btn-sm btn-outline" :disabled="busy" @click="batchSet({ featured: 0 })">取消精选</button>
      <button class="btn btn-sm btn-outline" :disabled="busy" @click="batchSet({ visibility: ASSET_VISIBILITY.PUBLIC })">设为公开</button>
      <button class="btn btn-sm btn-outline" :disabled="busy" @click="batchSet({ visibility: ASSET_VISIBILITY.PRIVATE })">设为未公开</button>
      <button class="btn btn-sm btn-ghost" style="margin-left: auto" @click="selected = []">取消选择</button>
    </div>

    <div v-if="page.loading" class="empty-state">加载中…</div>

    <div class="pf-grid">
      <div v-for="w in works" :key="w.id" class="pf-card card">
        <div class="pf-cover" :style="coverStyle(w)">
          <span class="pf-badge" :class="w.featured === 1 ? 'is-featured' : w.visibility === ASSET_VISIBILITY.PUBLIC ? 'is-public' : 'is-private'">
            {{ w.featured === 1 ? '精选展示' : w.visibility === ASSET_VISIBILITY.PUBLIC ? '公开' : '未公开' }}
          </span>
          <label class="pf-select" @click.stop>
            <input type="checkbox" :checked="selected.includes(w.id)" @change="toggleSelect(w.id)" />
          </label>
        </div>
        <div class="pf-body">
          <div class="pf-title-row">
            <strong class="serif">{{ w.title }}</strong>
            <span class="muted xsmall">{{ w.view_count || 0 }} 次浏览</span>
          </div>
          <p class="pf-meta">
            {{ w.category || '未分类' }} · {{ imageCount(w) }} 张<template v-if="w.shoot_date"> · {{ formatDate(w.shoot_date) }}</template>
          </p>
          <div class="pf-tags">
            <span class="pill">{{ firstPackageName(w) }}</span>
            <span v-if="w.authorization === ASSET_AUTH.PENDING" class="pill status-pending">待授权</span>
            <span v-if="w.status === ASSET_STATUS.DRAFT" class="pill status-draft">草稿</span>
          </div>
          <div class="pf-actions">
            <button v-perm="'asset:update'" class="btn btn-sm btn-outline" @click="openEdit(w)">编辑</button>
            <button class="btn btn-sm btn-outline" @click="shareWork()">分享</button>
            <button
              v-perm="'asset:audit'"
              class="btn btn-sm btn-outline"
              :disabled="busy"
              @click="toggleFlag(w, { featured: w.featured === 1 ? 0 : 1 })"
            >
              {{ w.featured === 1 ? '取消精选' : '设为精选' }}
            </button>
            <button
              v-perm="'asset:audit'"
              class="btn btn-sm btn-outline"
              :disabled="busy"
              @click="toggleFlag(w, { visibility: w.visibility === ASSET_VISIBILITY.PUBLIC ? ASSET_VISIBILITY.PRIVATE : ASSET_VISIBILITY.PUBLIC })"
            >
              {{ w.visibility === ASSET_VISIBILITY.PUBLIC ? '转未公开' : '转公开' }}
            </button>
            <button v-perm="'asset:delete'" class="btn btn-sm btn-ghost" :disabled="busy" @click="removeWork(w)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!page.loading && !works.length" class="empty-state">
      <strong>{{ page.error ? '加载失败' : '暂无作品' }}</strong>
      <p>{{ page.error ? page.error : '点击右上角「上传作品」创建第一组作品。' }}</p>
    </div>

    <div v-if="works.length" class="pf-select-all">
      <label class="check">
        <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
        <span>全选当前页（{{ works.length }}）</span>
      </label>
    </div>

    <!-- 上传 / 编辑 -->
    <BaseModal :open="workOpen" :title="editingId ? '编辑作品' : '上传作品'" :width="680" @close="workOpen = false">
      <form id="work-form" class="form-grid form-grid-2" @submit.prevent="saveWork">
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label"><span class="req">*</span> 作品标题</label>
          <input v-model="workForm.title" class="input" placeholder="例如：越秀公园 · 秋日家庭写真" />
        </div>
        <div class="field">
          <label class="field-label">作品分类</label>
          <select v-model="workForm.category" class="select">
            <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">关联套餐</label>
          <select v-model.number="workForm.package_id" class="select">
            <option :value="0">不关联套餐</option>
            <option v-for="p in packages" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">封面图</label>
          <div class="up-row">
            <div
              class="up-thumb"
              :class="{ 'is-empty': !isImageUrl(workForm.cover) }"
              :style="isImageUrl(workForm.cover) ? { backgroundImage: `url(${workForm.cover})` } : undefined"
            >
              <span v-if="!isImageUrl(workForm.cover)">未设置</span>
            </div>
            <div class="up-side">
              <div class="up-btns">
                <button
                  type="button"
                  class="btn btn-sm btn-outline"
                  :disabled="uploadingCover"
                  @click="openPicker(coverInput)"
                >
                  {{ uploadingCover ? '上传中…' : workForm.cover ? '更换封面' : '上传封面' }}
                </button>
                <button
                  v-if="workForm.cover"
                  type="button"
                  class="btn btn-sm btn-ghost"
                  @click="workForm.cover = ''"
                >
                  移除
                </button>
              </div>
              <p class="up-hint">留空则列表卡片显示占位底纹；从图集上传时第一张会自动补为封面</p>
            </div>
          </div>
          <input ref="coverInput" type="file" accept="image/*" class="up-input" @change="onPickCover" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">作品图片（{{ imageList.length }} 张）</label>
          <div class="up-grid">
            <div v-for="u in imageList" :key="u" class="up-cell">
              <span class="up-cell__img" :style="{ backgroundImage: `url(${u})` }" />
              <button type="button" class="up-cell__del" title="移除这张" @click="removeImage(u)">×</button>
            </div>
            <button
              type="button"
              class="up-cell up-cell--add"
              :disabled="uploadingImages"
              @click="openPicker(imagesInput)"
            >
              {{ uploadingImages ? '上传中…' : '+ 上传图片' }}
            </button>
          </div>
          <input
            ref="imagesInput"
            type="file"
            accept="image/*"
            multiple
            class="up-input"
            @change="onPickImages"
          />
        </div>
        <div class="field">
          <label class="field-label">可见性</label>
          <select v-model.number="workForm.visibility" class="select">
            <option :value="ASSET_VISIBILITY.PUBLIC">公开（客户可见）</option>
            <option :value="ASSET_VISIBILITY.PRIVATE">未公开（内部可见）</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">精选展示</label>
          <select v-model.number="workForm.featured" class="select">
            <option :value="1">是（主页顶部展示）</option>
            <option :value="0">否</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">作品状态</label>
          <select v-model.number="workForm.status" class="select">
            <option :value="ASSET_STATUS.DRAFT">草稿</option>
            <option :value="ASSET_STATUS.PUBLISHED">已发布</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">客户授权</label>
          <select v-model.number="workForm.authorization" class="select">
            <option :value="ASSET_AUTH.GRANTED">已授权</option>
            <option :value="ASSET_AUTH.PENDING">待授权</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">拍摄日期</label>
          <input v-model="workForm.shoot_date" class="input" type="date" />
        </div>
        <div class="field">
          <label class="field-label">拍摄地点</label>
          <input v-model="workForm.location" class="input" placeholder="如 越秀公园" />
        </div>
        <div class="field">
          <label class="field-label">摄影师</label>
          <input v-model="workForm.photographer" class="input" />
        </div>
        <div class="field">
          <label class="field-label">模特</label>
          <input v-model="workForm.model" class="input" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">作品描述</label>
          <textarea v-model="workForm.description" class="input" rows="3" placeholder="拍摄故事、风格说明…" />
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="workOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="work-form" :disabled="workSaving">
          {{ workSaving ? '保存中…' : '保存' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.data-source-tip.error {
  color: var(--red, #c0392b);
}

.pf-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
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

.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 12px;
  margin-bottom: 14px;
  border: 1px dashed var(--orange);
  border-radius: 10px;
  font-size: 12px;
  background: var(--cream, #faf7f2);
}

.pf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.pf-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pf-cover {
  height: 150px;
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px;
}

.pf-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 20px;
  background: rgba(255, 254, 250, 0.92);
  color: var(--ink-2, #333);
  backdrop-filter: blur(4px);
}

.pf-badge.is-featured {
  background: rgba(23, 37, 43, 0.85);
  color: #fff;
}

.pf-select {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 254, 250, 0.92);
  cursor: pointer;
}

.pf-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.pf-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.pf-meta {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.pf-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pf-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
  padding-top: 6px;
}

.pf-select-all {
  margin-top: 14px;
  font-size: 12px;
}

/* ── 上传控件（封面 + 图集）────────────────────── */
.up-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.up-thumb {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
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

/* 原生 file 输入隐藏，由按钮触发（保留键盘可达性：input 仍在 DOM 中） */
.up-input {
  display: none;
}

.up-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.up-cell {
  position: relative;
  box-sizing: border-box;
  width: 76px;
  height: 76px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
  background-color: var(--white);
}

.up-cell__img {
  display: block;
  width: 100%;
  height: 100%;
  background-position: center;
  background-size: cover;
}

.up-cell__del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(23, 37, 43, 0.72);
  color: #fff;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}

.up-cell--add {
  display: flex;
  align-items: center;
  justify-content: center;
  border-style: dashed;
  border-color: var(--orange);
  color: var(--orange-dark, var(--orange));
  font-size: 11px;
  background: transparent;
  cursor: pointer;
}

.up-cell--add:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
