<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import { useFetch } from '@/composables/useFetch'
import { listLeads, followLead } from '@/api/leads'
import { LEAD_STATUS_LABEL } from '@/types'
import type { Lead } from '@/types'

const filter = reactive({
  status: '' as number | '', // 线索状态 int 枚举 1-5，'' 为全部
  keyword: '',
  page: 1,
  page_size: 20
})

// 线索列表：接后端 lead/list（keyword/status 由后端过滤），失败即提示、不回退演示数据
const page = useFetch(() => listLeads({ ...filter }))
const leads = computed(() => page.data?.list || [])

watch(() => [filter.status, filter.page], () => {
  page.load()
})

function search() {
  filter.page = 1
  page.load()
}

const statusTone: Record<number, string> = {
  1: 'status-pending', // 待回复
  2: 'status-info', // 待报价
  3: 'status-ok', // 已报价
  4: 'status-ok', // 已成交
  5: 'status-error' // 已流失
}

async function onFollow(l: Lead) {
  try {
    await followLead(l.id)
    toastOk('跟进记录已添加')
    await page.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '跟进失败')
  }
}
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>线索与报价</h1>
        <p>来自各渠道的咨询线索，及时回复并推进报价转化。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="page.load">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
      </div>
    </div>

    <div v-if="page.error" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      线索加载失败：{{ page.error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="page.load">重试</button>
    </div>

    <div class="filter-bar">
      <div class="search-input">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          v-model="filter.keyword"
          class="input"
          placeholder="搜索客户 / 项目 / 备注"
          @keyup.enter="search"
        />
      </div>
      <button class="btn btn-outline" @click="search">查询</button>
      <select v-model="filter.status" class="select">
        <option value="">全部状态</option>
        <option v-for="(label, key) in LEAD_STATUS_LABEL" :key="key" :value="Number(key)">{{ label }}</option>
      </select>
    </div>

    <div v-if="page.loading" class="empty-state">加载中…</div>
    <div v-for="l in leads" :key="l.id" class="list-card">
      <span class="avatar" style="width: 40px; height: 40px; font-size: 15px">{{ l.name.slice(0, 1) }}</span>
      <div class="list-card-left">
        <div class="list-card-title">
          {{ l.code }} {{ l.name }}
          <span class="pill" :class="statusTone[l.status]">{{ LEAD_STATUS_LABEL[l.status] || l.status }}</span>
          <span class="tag">{{ l.source }}</span>
          <span v-if="l.budget_max" class="tag" style="background: #e8f3ee; color: var(--mint-dark)">
            ¥{{ l.budget_min }}–{{ l.budget_max }}
          </span>
        </div>
        <div class="list-card-sub">
          <b>{{ l.project_type }}</b>
          <span class="muted">{{ l.mobile }}</span>
          <span v-if="l.follower" class="muted">跟进 {{ l.follower }} 次</span>
        </div>
        <p class="muted small mt-8" style="margin-bottom: 0">{{ l.remark }}</p>
      </div>
      <div class="flex gap-6">
        <button class="btn btn-sm btn-primary" @click="onFollow(l)">跟进</button>
      </div>
    </div>
    <div v-if="!page.loading && !leads.length" class="empty-state">
      <strong>{{ page.error ? '加载失败' : '暂无线索' }}</strong>
      <p>{{ page.error ? page.error : '匹配不到符合条件的线索。' }}</p>
    </div>
  </div>
</template>
