<script setup lang="ts">
import { ref } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'

interface Pkg {
  id: number
  name: string
  type: string
  price: number
  deposit_ratio: number
  shots: number
  scenes: number
  outfits: number
  prints: string
  status: 'active' | 'paused'
}

const pkgs = ref<Pkg[]>([
  { id: 1, name: '家庭纪念写真', type: '家庭写真', price: 2680, deposit_ratio: 20, shots: 30, scenes: 2, outfits: 2, prints: '6×6 相册 + 8 寸相框', status: 'active' },
  { id: 2, name: '商务形象照', type: '商务肖像', price: 1800, deposit_ratio: 20, shots: 12, scenes: 1, outfits: 2, prints: '精修 6 张 + 电子版', status: 'active' },
  { id: 3, name: '婚礼跟拍', type: '婚礼跟拍', price: 4800, deposit_ratio: 30, shots: 400, scenes: 2, outfits: 0, prints: '精修 80 张 + 相册', status: 'active' },
  { id: 4, name: '亲子写真', type: '家庭写真', price: 1680, deposit_ratio: 20, shots: 20, scenes: 1, outfits: 2, prints: '精修 12 张', status: 'active' },
  { id: 5, name: '自然人像', type: '自然人像', price: 1680, deposit_ratio: 20, shots: 25, scenes: 1, outfits: 1, prints: '精修 10 张', status: 'active' },
  { id: 6, name: '证件照', type: '证件照', price: 480, deposit_ratio: 100, shots: 4, scenes: 1, outfits: 0, prints: '1 版', status: 'active' }
])

const addOpen = ref(false)
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
        <button class="btn btn-primary" @click="addOpen = true">+ 新建套餐</button>
      </div>
    </div>

    <div class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
      演示数据（后端未连接）— 套餐模块支持 API 接口。
    </div>

    <div class="grid cols-3 g-16" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))">
      <div v-for="p in pkgs" :key="p.id" class="card card-pad pkg">
        <div class="flex between">
          <span class="tag">{{ p.type }}</span>
          <span class="pill" :class="p.status === 'active' ? 'status-ok' : 'status-disabled'">
            {{ p.status === 'active' ? '在售' : '停售' }}
          </span>
        </div>
        <h3 class="serif" style="margin: 13px 0 4px; font-size: 18px">{{ p.name }}</h3>
        <div class="pkg-price">
          <b>¥{{ p.price.toLocaleString() }}</b>
          <span class="muted xsmall">定金 {{ p.deposit_ratio }}%</span>
        </div>
        <div class="pkg-meta">
          <span>精修 {{ p.shots }} 张</span>
          <span>{{ p.scenes }} 组场景</span>
          <span>{{ p.outfits }} 套造型</span>
        </div>
        <div class="divider"></div>
        <div class="flex between">
          <span class="muted small">交付：{{ p.prints }}</span>
          <button class="btn btn-sm btn-outline" @click="toastOk('编辑功能（演示）')">编辑</button>
        </div>
      </div>
    </div>

    <BaseModal :open="addOpen" title="新建套餐" @close="addOpen = false">
      <form id="modal-form" class="form-grid form-grid-2" @submit.prevent="toastOk('套餐已创建（演示）'); addOpen = false">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 套餐名称</label>
          <input class="input" placeholder="如 婚礼跟拍" />
        </div>
        <div class="field">
          <label class="field-label">类型</label>
          <select class="select">
            <option value="家庭写真">家庭写真</option>
            <option value="商务肖像">商务肖像</option>
            <option value="婚礼跟拍">婚礼跟拍</option>
            <option value="自然人像">自然人像</option>
            <option value="证件照">证件照</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 价格（元）</label>
          <input class="input" type="number" min="0" />
        </div>
        <div class="field">
          <label class="field-label">定金比例（%）</label>
          <input class="input" type="number" min="0" max="100" />
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="addOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="modal-form">保存</button>
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
</style>