<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as packageApi from '@/api/packages'
import { useFetch } from '@/composables/useFetch'
import type { Package } from '@/types'
import { PACKAGE_STATUS, PACKAGE_STATUS_LABEL } from '@/types'

const query = reactive({ page: 1, page_size: 60 })

// 套餐列表：走真实接口，失败即提示（不再内联演示数据）
const page = useFetch(() => packageApi.listPackages(query as Record<string, unknown>))
const pkgs = computed(() => page.data?.list || [])

const addOpen = ref(false)
const saving = ref(false)
/** 0 = 新建；>0 = 正在编辑的套餐 id */
const editingId = ref(0)
const form = reactive({
  name: '',
  category: '',
  base_price: 0,
  // 定金比例：后端是**百分数**（DDL `decimal(5,2) DEFAULT 30.00` 注释「定金比例(%)」，
  // service 用 `base_price * deposit_rate / 100` 算 deposit_amt），
  // 因此表单直接按 % 录入，不做 ×100 / ÷100 换算（旧代码当小数处理会把 30% 存成 0.3%）。
  deposit_rate: 0,
  photos_included: 0,
  shoot_hours: 0,
  content_desc: '',
  addon_unit_price: 0
})

function resetForm() {
  Object.assign(form, {
    name: '',
    category: '',
    base_price: 0,
    deposit_rate: 0,
    photos_included: 0,
    shoot_hours: 0,
    content_desc: '',
    addon_unit_price: 0
  })
}

function openCreate() {
  resetForm()
  editingId.value = 0
  addOpen.value = true
}

/** 编辑：把列表行回填进表单（字段与后端 dto.PackageReq 对齐） */
function openEdit(p: Package) {
  Object.assign(form, {
    name: p.name || '',
    category: p.category || '',
    base_price: p.base_price ?? 0,
    deposit_rate: p.deposit_rate ?? 0,
    photos_included: p.photos_included ?? 0,
    shoot_hours: p.shoot_hours ?? 0,
    content_desc: p.content_desc || '',
    addon_unit_price: p.addon_unit_price ?? 0
  })
  editingId.value = p.id
  addOpen.value = true
}

async function savePackage() {
  if (!form.name.trim()) {
    toastErr('请输入套餐名称')
    return
  }
  if (form.base_price <= 0) {
    toastErr('请输入有效的套餐价格')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      // 编辑不传 status：后端 status=0 表示保持原值，避免把已上架套餐打回草稿
      await packageApi.updatePackage(editingId.value, { ...form })
      toastOk('套餐已保存')
    } else {
      await packageApi.createPackage({ ...form, status: PACKAGE_STATUS.DRAFT })
      toastOk('套餐已创建（草稿，可在卡片上上架）')
    }
    addOpen.value = false
    resetForm()
    editingId.value = 0
    page.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(p: Package) {
  const next = p.status === PACKAGE_STATUS.ACTIVE ? PACKAGE_STATUS.OFFLINE : PACKAGE_STATUS.ACTIVE
  try {
    await packageApi.setPackageStatus(p.id, next)
    toastOk(next === PACKAGE_STATUS.ACTIVE ? '套餐已上架' : '套餐已下线')
    page.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '操作失败')
  }
}

const statusTone: Record<number, string> = {
  [PACKAGE_STATUS.DRAFT]: 'status-disabled',
  [PACKAGE_STATUS.ACTIVE]: 'status-ok',
  [PACKAGE_STATUS.OFFLINE]: 'status-muted'
}
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>套餐管理</h1>
        <p>定价、定金比例与交付标准的统一配置。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="page.load">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
        <button v-perm="'package:create'" class="btn btn-primary" @click="openCreate">+ 新建套餐</button>
      </div>
    </div>

    <div v-if="page.error" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      套餐数据加载失败：{{ page.error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="page.load">重试</button>
    </div>

    <div class="grid cols-3 g-16" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))">
      <div v-for="p in pkgs" :key="p.id" class="card card-pad pkg">
        <div class="flex between">
          <span class="tag">{{ p.category || '未分类' }}</span>
          <span class="pill" :class="statusTone[p.status] || 'status-disabled'">
            {{ PACKAGE_STATUS_LABEL[p.status] || p.status }}
          </span>
        </div>
        <h3 class="serif" style="margin: 13px 0 4px; font-size: 18px">{{ p.name }}</h3>
        <div class="pkg-price">
          <b>¥{{ p.base_price.toLocaleString() }}</b>
          <span class="muted xsmall">定金 {{ p.deposit_rate }}%</span>
        </div>
        <div class="pkg-meta">
          <span>精修 {{ p.photos_included }} 张</span>
          <span>{{ p.shoot_hours }} 小时</span>
          <span>加片 ¥{{ p.addon_unit_price }}/张</span>
        </div>
        <div class="divider"></div>
        <div class="flex between">
          <span class="muted small">{{ p.content_desc || '暂无交付说明' }}</span>
          <div class="pkg-actions">
            <button v-perm="'package:update'" class="btn btn-sm btn-outline" @click="openEdit(p)">
              编辑
            </button>
            <button v-perm="'package:publish'" class="btn btn-sm btn-outline" @click="toggleStatus(p)">
              {{ p.status === PACKAGE_STATUS.ACTIVE ? '下线' : '上架' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!pkgs.length && !page.loading" class="empty-state">
      <strong>暂无套餐</strong>
      <p>点击右上角「新建套餐」创建第一个套餐。</p>
    </div>

    <BaseModal
      :open="addOpen"
      :title="editingId ? '编辑套餐' : '新建套餐'"
      @close="addOpen = false"
    >
      <form id="modal-form" class="form-grid form-grid-2" @submit.prevent="savePackage">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 套餐名称</label>
          <input v-model="form.name" class="input" placeholder="如 婚礼跟拍" />
        </div>
        <div class="field">
          <label class="field-label">分类</label>
          <input v-model="form.category" class="input" placeholder="如 家庭写真" />
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 价格（元）</label>
          <input v-model.number="form.base_price" class="input" type="number" min="0" />
        </div>
        <div class="field">
          <label class="field-label">定金比例（%）</label>
          <input v-model.number="form.deposit_rate" class="input" type="number" min="0" max="100" step="0.01" />
        </div>
        <div class="field">
          <label class="field-label">包含精修（张）</label>
          <input v-model.number="form.photos_included" class="input" type="number" min="0" />
        </div>
        <div class="field">
          <label class="field-label">拍摄时长（小时）</label>
          <input v-model.number="form.shoot_hours" class="input" type="number" min="0" step="0.5" />
        </div>
        <div class="field">
          <label class="field-label">加片单价（元/张）</label>
          <input v-model.number="form.addon_unit_price" class="input" type="number" min="0" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label">交付说明</label>
          <textarea v-model="form.content_desc" class="textarea" rows="2" placeholder="如 精修 80 张 + 相册"></textarea>
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="addOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="modal-form" :disabled="saving">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.pkg-price {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}

.pkg-price b {
  font-size: 22px;
  color: var(--orange-dark);
  letter-spacing: -0.02em;
}

.pkg-meta {
  display: flex;
  gap: 14px;
  font-size: 11px;
  color: var(--ink-2);
  flex-wrap: wrap;
  background: #fbfaf6;
  border-radius: 10px;
  padding: 9px 12px;
}

/* 卡片底部操作区：说明文字可压缩，按钮不换行 */
.pkg-actions {
  display: flex;
  gap: 8px;
  flex: none;
  margin-left: 12px;
}
</style>
