<script setup lang="ts">
import { ref } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk } from '@/composables/useToast'
import { formatDate } from '@/utils/format'

interface Rework {
  id: number
  order: string
  customer: string
  count: number
  note: string
  deadline: string
  status: '处理中' | '待提交'
}

interface Practice {
  id: number
  order: string
  customer: string
  progress: string
  deadline: string
  status: '待选片' | '待回传' | '待客审'
}

const reworks = ref<Rework[]>([
  {
    id: 1,
    order: 'SL-260803-04',
    customer: '李芳',
    count: 4,
    note: '第 3 张修得太假，要求回归自然肤色；第 7 张孩子闭眼需换帧。',
    deadline: '2026-08-18',
    status: '处理中'
  }
])

const practices = ref<Practice[]>([
  { id: 1, order: 'SL-260806-05', customer: '王浩', progress: '已回传 12/12', deadline: '2026-08-15', status: '待客审' },
  { id: 2, order: 'SL-260803-04', customer: '李芳', progress: '选片占位 24', deadline: '2026-08-12', status: '待选片' }
])

const tab = ref<'rework' | 'practice'>('rework')
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>选片与精修</h1>
        <p>精修反馈、返工单与选片进度跟踪。</p>
      </div>
      <div class="page-actions">
        <button
          class="btn btn-outline"
          @click="toastOk('已同步（演示）')"
        >
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          同步
        </button>
      </div>
    </div>

    <div class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
      演示数据（后端未连接）— 交付模块支持 API 接口。
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'rework' }" @click="tab = 'rework'">精修返工 · {{ reworks.length }}</button>
      <button class="tab" :class="{ active: tab === 'practice' }" @click="tab = 'practice'">选片 · {{ practices.length }}</button>
    </div>

    <!-- 精修返工 -->
    <div v-if="tab === 'rework'">
      <div v-for="r in reworks" :key="r.id" class="list-card">
        <div class="list-card-left">
          <div class="list-card-title">
            {{ r.customer }} · {{ r.order }}
            <span class="pill status-pending">{{ r.status }}</span>
          </div>
          <div class="list-card-sub">
            {{ r.count }} 处返工 · 到期 {{ formatDate(r.deadline) }}
          </div>
          <p v-if="r.note" class="muted small mt-8" style="margin-bottom: 0">{{ r.note }}</p>
        </div>
        <div class="flex gap-6">
          <button class="btn btn-sm btn-outline">查看反馈</button>
          <button class="btn btn-sm btn-primary" @click="toastOk('已标记完成')">完成返工</button>
        </div>
      </div>
      <div v-if="!reworks.length" class="empty-state"><strong>暂无返工</strong></div>
    </div>

    <!-- 选片 -->
    <div v-if="tab === 'practice'">
      <div v-for="p in practices" :key="p.id" class="list-card">
        <div class="list-card-left">
          <div class="list-card-title">
            {{ p.customer }} · {{ p.order }}
            <span class="pill" :class="p.status === '待客审' ? 'status-ok' : 'status-pending'">{{ p.status }}</span>
          </div>
          <div class="list-card-sub">{{ p.progress }} · 截止 {{ formatDate(p.deadline) }}</div>
        </div>
        <div class="flex gap-6">
          <button class="btn btn-sm btn-outline">上传工作区</button>
          <button class="btn btn-sm btn-primary" @click="toastOk('选片链接已发送')">发送选片</button>
        </div>
      </div>
      <div v-if="!practices.length" class="empty-state"><strong>暂无选片</strong></div>
    </div>
  </div>
</template>