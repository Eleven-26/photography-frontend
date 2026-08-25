<script setup lang="ts">
import { ref } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as calendarApi from '@/api/calendar'
import * as demo from '@/api/demo'
import { useFetch } from '@/composables/useFetch'
import type { CalendarSlot } from '@/types'

const days = ['日', '一', '二', '三', '四', '五', '六']

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const selectedDate = ref(todayStr())

function weekDates() {
  const base = new Date(selectedDate.value + 'T00:00:00')
  const day = base.getDay()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() - day + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}

const week = ref(weekDates())

function shiftWeek(days: number) {
  const d = new Date(selectedDate.value + 'T00:00:00')
  d.setDate(d.getDate() + days)
  selectedDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  week.value = weekDates()
}

const slots = useFetch<CalendarSlot[]>(
  () => calendarApi.listCalendar({ page: 1, page_size: 200 }).then((r) => r.list),
  () => demo.demoCalendarSlots
)

function slotsFor(date: string) {
  return (slots.data || []).filter((s) => s.date === date)
}

const addOpen = ref(false)
const form = ref({
  date: todayStr(),
  start_time: '09:00',
  end_time: '10:00',
  remark: ''
})

async function saveSlot() {
  if (!form.value.remark) {
    toastErr('请填写备注')
    return
  }
  try {
    try {
      await calendarApi.lockCalendar({
        date: form.value.date,
        start_time: form.value.start_time,
        end_time: form.value.end_time,
        remark: form.value.remark
      })
      toastOk('档期已锁定')
    } catch {
      toastOk('档期已锁定（演示）')
    }
    addOpen.value = false
    slots.load()
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
        <h1>日程与档期</h1>
        <p>资源排期、冲突预警与关闭时段管理。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="slots.load()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
        <button class="btn btn-primary" @click="addOpen = true">+ 新增档期</button>
      </div>
    </div>

    <div v-if="slots.source === 'demo'" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
      演示数据（后端未连接）。
    </div>

    <div class="card card-pad week-nav">
      <span class="fortune-day">{{ week[0].slice(5).replace('-', '/') }} — {{ week[6].slice(5).replace('-', '/') }}</span>
      <div class="flex gap-6">
        <button class="btn btn-outline btn-sm" @click="shiftWeek(-7)">‹ 上一周</button>
        <button class="btn btn-outline btn-sm" @click="shiftWeek(7)">下一周 ›</button>
        <button class="btn btn-dark btn-sm" @click="selectedDate = todayStr(); week = weekDates()">回到今天</button>
      </div>
    </div>

    <div class="week-grid">
      <div
        v-for="date in week"
        :key="date"
        class="day-col"
        :class="{ today: date === todayStr() }"
      >
        <div class="day-head" @click="selectedDate = date; form.date = date">
          <span class="day-name">{{ days[(new Date(date + 'T00:00:00')).getDay()] }}</span>
          <span class="day-num">{{ date.slice(8) }}</span>
        </div>
        <div class="day-slots">
          <div
            v-for="s in slotsFor(date)"
            :key="s.id"
            class="slot"
            :class="s.block_type"
          >
            <div class="slot-time">{{ s.start_time }}-{{ s.end_time }}</div>
            <div class="slot-title">{{ s.remark || s.block_type }}</div>
            <span class="pill" :class="s.block_type === 'locked' ? 'status-pending' : 'status-disabled'">
              {{ s.block_type === 'locked' ? '已锁定' : '已取消' }}
            </span>
          </div>
          <div v-if="!slotsFor(date).length" class="slot slot-empty">空闲</div>
        </div>
      </div>
    </div>

    <BaseModal :open="addOpen" title="新增档期" @close="addOpen = false">
      <form id="modal-form" class="form-grid form-grid-2" @submit.prevent="saveSlot">
        <div class="field">
          <label class="field-label">日期</label>
          <input v-model="form.date" class="input" type="date" />
        </div>
        <div class="field">
          <label class="field-label">开始</label>
          <input v-model="form.start_time" class="input" type="time" />
        </div>
        <div class="field">
          <label class="field-label">结束</label>
          <input v-model="form.end_time" class="input" type="time" />
        </div>
        <div class="field" style="grid-column: 1 / -1">
          <label class="field-label"><span class="req">*</span> 备注</label>
          <input v-model="form.remark" class="input" placeholder="如 午休 / 布景维护" />
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<style scoped>
.week-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.fortune-day {
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 9px;
  margin-top: 16px;
}

@media (max-width: 980px) {
  .week-grid {
    grid-template-columns: 1fr;
  }
}

.day-col {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 14px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.day-col.today {
  border-color: var(--orange);
  box-shadow: 0 0 0 2px rgba(233, 138, 75, 0.15);
}

.day-head {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  background: #fbfaf6;
}

.day-name {
  font-size: 10px;
  color: var(--muted);
}

.day-num {
  font: 700 17px 'DM Sans', sans-serif;
}

.day-col.today .day-num {
  color: var(--orange-dark);
}

.day-slots {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.slot {
  border-radius: 9px;
  padding: 7px 9px;
  font-size: 10px;
  position: relative;
}

.slot-time {
  font: 700 9px 'DM Sans', sans-serif;
  color: inherit;
  opacity: 0.85;
}

.slot-title {
  font-weight: 700;
  font-size: 11px;
  margin: 3px 0 1px;
}

.slot.locked {
  background: #fdeadd;
  color: var(--orange-dark);
}

.slot.cancelled {
  background: #edeeea;
  color: var(--ink-2);
}

.slot-empty {
  color: var(--muted);
  border: 1px dashed var(--line-2);
  background: transparent;
}
</style>
