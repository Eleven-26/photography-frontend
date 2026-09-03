<script setup lang="ts">
import { computed, reactive } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk } from '@/composables/useToast'
import * as demo from '@/api/demo'
import { useFetch } from '@/composables/useFetch'
import { followLead } from '@/api/leads'
import { LEAD_STATUS_LABEL } from '@/types'
import type { Lead } from '@/types'

const page = useFetch(
  () => Promise.resolve(demo.demoLeadsPage({ ...filter })),
  () => demo.demoLeadsPage({ ...filter })
)

const leads = computed(() => page.data?.list || [])

const filter = reactive({ status: '' as number | '', keyword: '' })

const statusTone: Record<number, string> = {
  1: 'status-pending', // 待回复
  2: 'status-info', // 待报价
  3: 'status-ok', // 已报价
  4: 'status-ok', // 已成交
  5: 'status-lose' // 已流失
}

const filtered = computed(() =>
  leads.value.filter((l) => {
    if (filter.status && l.status !== filter.status) return false
    if (filter.keyword && !(l.name + l.project_type + l.remark + l.mobile).includes(filter.keyword)) return false
    return true
  })
)

async function onFollow(l: Lead) {
  await followLead(l.id)
  l.follower++
  toastOk('跟进记录已添加')
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

    <div class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
      演示数据 — 线索模块后端接口规划中。
    </div>

    <div class="filter-bar">
      <div class="search-input">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input v-model="filter.keyword" class="input" placeholder="搜索客户 / 项目 / 备注" />
      </div>
      <select v-model="filter.status" class="select">
        <option value="">全部状态</option>
        <option v-for="(label, key) in LEAD_STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <div v-if="page.loading" class="empty-state">加载中…</div>
    <div v-for="l in filtered" :key="l.id" class="list-card">
      <span class="avatar" style="width: 40px; height: 40px; font-size: 15px">{{ l.name.slice(0, 1) }}</span>
      <div class="list-card-left">
        <div class="list-card-title">
          {{ l.code }} {{ l.name }}
          <span class="pill" :class="statusTone[l.status]">{{ LEAD_STATUS_LABEL[l.status] }}</span>
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
    <div v-if="!page.loading && !filtered.length" class="empty-state">
      <strong>暂无线索</strong>
      <p>匹配不到符合条件的线索。</p>
    </div>
  </div>
</template>
