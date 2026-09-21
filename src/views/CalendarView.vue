<script setup lang="ts">
import { computed, ref } from 'vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as calendarApi from '@/api/calendar'
import { useFetch } from '@/composables/useFetch'
import type { CalendarSlot, SlotTemplate } from '@/types'
import { BLOCK_STATUS, WEEKDAY_LABEL } from '@/constants/enums'

const days = ['日', '一', '二', '三', '四', '五', '六']

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const selectedDate = ref(ymd(new Date()))

function weekDates() {
  const base = new Date(selectedDate.value + 'T00:00:00')
  const day = base.getDay()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() - day + i)
    return ymd(d)
  })
}

const week = ref(weekDates())

function shiftWeek(n: number) {
  const d = new Date(selectedDate.value + 'T00:00:00')
  d.setDate(d.getDate() + n)
  selectedDate.value = ymd(d)
  week.value = weekDates()
}

/* ── 数据源 ───────────────────────────────────── */
// 档期列表：后端 calendar/list 返回数组（非分页）
const slots = useFetch<CalendarSlot[]>(() => calendarApi.listCalendar())
const rules = useFetch<SlotTemplate[]>(() => calendarApi.listSlotTemplates())

const activeSlots = computed(() => (slots.data || []).filter((s) => s.status === BLOCK_STATUS.LOCKED))

function slotsFor(date: string) {
  return activeSlots.value.filter((s) => s.date === date)
}

/* ── 视图切换 ─────────────────────────────────── */
const viewMode = ref<'week' | 'month' | 'resource'>('week')

const monthCells = computed(() => {
  const base = new Date(selectedDate.value + 'T00:00:00')
  const first = new Date(base.getFullYear(), base.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = ymd(d)
    return { date: key, inMonth: d.getMonth() === base.getMonth(), count: slotsFor(key).length }
  })
})

const monthLabel = computed(() => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
})

/** 资源视图：把当前周按摄影师拆行，同一格内可见该摄影师的档期 */
const resourceRows = computed(() => {
  const map = new Map<number, { id: number; name: string }>()
  for (const s of activeSlots.value) {
    if (!week.value.includes(s.date)) continue
    if (!map.has(s.photographer_id)) {
      map.set(s.photographer_id, {
        id: s.photographer_id,
        name: s.photographer || (s.photographer_id ? `摄影师 #${s.photographer_id}` : '未指派')
      })
    }
  }
  return Array.from(map.values())
})

function resourceCell(photographerId: number, date: string) {
  return activeSlots.value.filter((s) => s.date === date && s.photographer_id === photographerId)
}

/* ── 档期规则统计（全部由真实数据推导）─────────── */
const enabledRules = computed(() => (rules.data || []).filter((r) => r.status === 1))

/** 常规接单时间：取所有启用模板的最早开始 / 最晚结束 */
const workWindow = computed(() => {
  const list = enabledRules.value
  if (!list.length) return '未配置'
  const starts = list.map((r) => r.start_time).sort()
  const ends = list.map((r) => r.end_time).sort()
  return `${starts[0]}—${ends[ends.length - 1]}`
})

const workWeekdays = computed(() => {
  const set = new Set(enabledRules.value.map((r) => r.weekday))
  if (!set.size) return '未配置'
  return Array.from(set)
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((w) => WEEKDAY_LABEL[w].replace('周', ''))
    .join('、')
})

/** 未来 30 天可约天数：该日有启用模板，且未被整日锁定 */
const bookableDays = computed(() => {
  const now = new Date()
  let count = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const key = ymd(d)
    if (!enabledRules.value.some((r) => r.weekday === d.getDay())) continue
    if (slotsFor(key).length >= 2) continue
    count++
  }
  return count
})

/** 资源冲突：同一天存在时间区间重叠的锁定档期（按摄影师维度） */
const conflicts = computed(() => {
  const byDay = new Map<string, CalendarSlot[]>()
  for (const s of activeSlots.value) {
    const arr = byDay.get(s.date) || []
    arr.push(s)
    byDay.set(s.date, arr)
  }
  let n = 0
  for (const arr of byDay.values()) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i].photographer_id !== arr[j].photographer_id) continue
        if (overlaps(arr[i].time_range, arr[j].time_range)) n++
      }
    }
  }
  return n
})

function overlaps(a: string, b: string) {
  const [as, ae] = a.split('-')
  const [bs, be] = b.split('-')
  if (!as || !ae || !bs || !be) return false
  return as < be && bs < ae
}

const lastCloseLabel = computed(() => {
  const list = activeSlots.value.filter((s) => s.date >= ymd(new Date())).sort((a, b) => a.date.localeCompare(b.date))
  return list.length ? `${list[0].date.slice(5)} ${list[0].time_range}` : '暂无'
})

/* ── 关闭时段 ─────────────────────────────────── */
const addOpen = ref(false)
const form = ref({
  date: ymd(new Date()),
  start_time: '09:00',
  end_time: '10:00',
  remark: ''
})

function openLock(date?: string) {
  form.value = { date: date || selectedDate.value, start_time: '09:00', end_time: '10:00', remark: '' }
  addOpen.value = true
}

async function saveSlot() {
  if (!form.value.remark) {
    toastErr('请填写备注')
    return
  }
  if (form.value.start_time >= form.value.end_time) {
    toastErr('结束时间需晚于开始时间')
    return
  }
  try {
    await calendarApi.lockCalendar({
      date: form.value.date,
      time_range: `${form.value.start_time}-${form.value.end_time}`,
      remark: form.value.remark
    })
    toastOk('档期已关闭')
    addOpen.value = false
    slots.load()
  } catch (e) {
    // 失败必须如实提示，不能伪造"已锁定"
    toastErr(e instanceof Error ? e.message : '关闭时段失败')
  }
}

async function cancelBlock(s: CalendarSlot) {
  try {
    await calendarApi.cancelCalendar(s.id)
    toastOk('已恢复该时段')
    slots.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '操作失败')
  }
}

/* ── 档期规则维护 ─────────────────────────────── */
const ruleOpen = ref(false)
const ruleForm = ref({
  id: 0,
  weekday: 1,
  start_time: '09:00',
  end_time: '18:00',
  status: 1
})

function openRule(r?: SlotTemplate) {
  ruleForm.value = r
    ? { id: r.id, weekday: r.weekday, start_time: r.start_time, end_time: r.end_time, status: r.status }
    : { id: 0, weekday: 1, start_time: '09:00', end_time: '18:00', status: 1 }
  ruleOpen.value = true
}

async function saveRule() {
  if (ruleForm.value.start_time >= ruleForm.value.end_time) {
    toastErr('结束时间需晚于开始时间')
    return
  }
  try {
    await calendarApi.saveSlotTemplate(
      {
        weekday: ruleForm.value.weekday,
        start_time: ruleForm.value.start_time,
        end_time: ruleForm.value.end_time,
        status: ruleForm.value.status
      },
      ruleForm.value.id || undefined
    )
    toastOk('档期规则已保存')
    ruleOpen.value = false
    rules.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '保存失败')
  }
}

async function removeRule(r: SlotTemplate) {
  try {
    await calendarApi.deleteSlotTemplate(r.id)
    toastOk('规则已删除')
    rules.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '删除失败')
  }
}

function reloadAll() {
  slots.load()
  rules.load()
}
</script>

<template>
  <div>

    <div class="page-head">
      <div>
        <h1>日程与档期</h1>
        <p>同时看见已确认订单、可约时段和资源冲突。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="reloadAll">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
        <button class="btn btn-primary" @click="openLock()">+ 关闭时段</button>
      </div>
    </div>

    <div v-if="slots.error || rules.error" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
      档期数据加载失败：{{ slots.error || rules.error }}
      <button class="btn btn-sm btn-outline" style="margin-left: auto" @click="reloadAll">重试</button>
    </div>

    <div class="card card-pad week-nav">
      <div>
        <div class="fortune-day">{{ monthLabel }} · 第 {{ week[0].slice(5).replace('-', '/') }} 周</div>
        <div class="muted xsmall mt-8">常规接单时间 {{ workWindow }} · 周{{ workWeekdays }}</div>
      </div>
      <div class="flex gap-6">
        <button class="btn btn-outline btn-sm" @click="shiftWeek(-7)">‹ 上一周</button>
        <button class="btn btn-dark btn-sm" @click="selectedDate = ymd(new Date()); week = weekDates()">今天</button>
        <button class="btn btn-outline btn-sm" @click="shiftWeek(7)">下一周 ›</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: viewMode === 'week' }" @click="viewMode = 'week'">周视图</button>
      <button class="tab" :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">月视图</button>
      <button class="tab" :class="{ active: viewMode === 'resource' }" @click="viewMode = 'resource'">资源视图</button>
    </div>

    <!-- 周视图 -->
    <div v-if="viewMode === 'week'" class="week-grid">
      <div v-for="date in week" :key="date" class="day-col" :class="{ today: date === ymd(new Date()) }">
        <div class="day-head" @click="openLock(date)">
          <span class="day-name">{{ days[new Date(date + 'T00:00:00').getDay()] }}</span>
          <span class="day-num">{{ date.slice(8) }}</span>
        </div>
        <div class="day-slots">
          <div v-for="s in slotsFor(date)" :key="s.id" class="slot locked">
            <div class="slot-time">{{ s.time_range }}</div>
            <div class="slot-title">{{ s.remark || '已关闭' }}</div>
            <button class="slot-x" title="恢复该时段" @click.stop="cancelBlock(s)">×</button>
          </div>
          <div v-if="!slotsFor(date).length" class="slot slot-empty">可约</div>
        </div>
      </div>
    </div>

    <!-- 月视图 -->
    <div v-else-if="viewMode === 'month'" class="month-grid">
      <div v-for="d in days" :key="d" class="month-head">{{ d }}</div>
      <div
        v-for="c in monthCells"
        :key="c.date"
        class="month-cell"
        :class="{ dim: !c.inMonth, today: c.date === ymd(new Date()) }"
        @click="openLock(c.date)"
      >
        <span class="month-num">{{ c.date.slice(8) }}</span>
        <span v-if="c.count" class="pill status-pending">{{ c.count }} 关闭</span>
        <span v-else-if="c.inMonth" class="month-free">可约</span>
      </div>
    </div>

    <!-- 资源视图 -->
    <div v-else class="card table-card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>摄影师</th>
              <th v-for="date in week" :key="date">{{ date.slice(5) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in resourceRows" :key="r.id">
              <td><span class="cell-main">{{ r.name }}</span></td>
              <td v-for="date in week" :key="date">
                <template v-for="s in resourceCell(r.id, date)" :key="s.id">
                  <div class="res-block">{{ s.time_range }}<br />{{ s.remark || '已关闭' }}</div>
                </template>
                <span v-if="!resourceCell(r.id, date).length" class="muted small">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!resourceRows.length" class="empty-state">
        <strong>本周暂无资源排期</strong>
        <p>客户预约或手动关闭时段后，将按摄影师在此列出。</p>
      </div>
    </div>

    <!-- 档期规则 -->
    <div class="section-head">
      <h2>档期规则</h2>
      <button class="btn btn-sm btn-outline" @click="openRule()">+ 新增规则</button>
    </div>

    <div class="stats-grid stats-4">
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-mint">时</span>常规接单时间</div>
        <div class="stat-value" style="font-size: 20px">周{{ workWeekdays }}</div>
        <div class="stat-sub">{{ workWindow }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-orange">约</span>未来 30 天可约</div>
        <div class="stat-value">{{ bookableDays }}</div>
        <div class="stat-sub">按已启用规则推导</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-lav">关</span>关闭时段</div>
        <div class="stat-value">{{ activeSlots.length }}</div>
        <div class="stat-sub">最近：{{ lastCloseLabel }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-red">冲</span>资源冲突</div>
        <div class="stat-value">{{ conflicts }}</div>
        <div class="stat-sub">{{ conflicts ? '存在重叠排期' : '当前无冲突' }}</div>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>星期</th><th>时段</th><th>状态</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="r in rules.data || []" :key="r.id">
              <td><span class="cell-main">{{ WEEKDAY_LABEL[r.weekday] }}</span></td>
              <td>{{ r.start_time }} — {{ r.end_time }}</td>
              <td>
                <span class="pill" :class="r.status === 1 ? 'status-ok' : 'status-disabled'">
                  {{ r.status === 1 ? '启用' : '停用' }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline" @click="openRule(r)">编辑</button>
                <button class="btn btn-sm btn-ghost" @click="removeRule(r)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!rules.loading && !(rules.data || []).length" class="empty-state">
        <strong>尚未配置档期规则</strong>
        <p>配置后，客户预约主页才会开放对应的可约时段。</p>
      </div>
    </div>

    <!-- 关闭时段 -->
    <BaseModal :open="addOpen" title="关闭时段" @close="addOpen = false">
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
          <input v-model="form.remark" class="input" placeholder="如 午休 / 布景维护 / 外出拍摄" />
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="addOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="modal-form">保存</button>
      </template>
    </BaseModal>

    <!-- 档期规则 -->
    <BaseModal :open="ruleOpen" :title="ruleForm.id ? '编辑档期规则' : '新增档期规则'" @close="ruleOpen = false">
      <form id="rule-form" class="form-grid form-grid-2" @submit.prevent="saveRule">
        <div class="field">
          <label class="field-label">星期</label>
          <select v-model.number="ruleForm.weekday" class="select">
            <option v-for="w in [1, 2, 3, 4, 5, 6, 0]" :key="w" :value="w">{{ WEEKDAY_LABEL[w] }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">状态</label>
          <select v-model.number="ruleForm.status" class="select">
            <option :value="1">启用</option>
            <option :value="0">停用</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">开始时间</label>
          <input v-model="ruleForm.start_time" class="input" type="time" />
        </div>
        <div class="field">
          <label class="field-label">结束时间</label>
          <input v-model="ruleForm.end_time" class="input" type="time" />
        </div>
      </form>
      <template #foot>
        <button class="btn btn-ghost" @click="ruleOpen = false">取消</button>
        <button class="btn btn-primary" type="submit" form="rule-form">保存</button>
      </template>
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
  margin-top: 4px;
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
  min-height: 240px;
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

.slot-empty {
  color: var(--muted);
  border: 1px dashed var(--line-2);
  background: transparent;
}

.slot-x {
  position: absolute;
  top: 4px;
  right: 6px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
  font-size: 13px;
  line-height: 1;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-top: 4px;
}

.month-head {
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  padding: 4px 0;
}

.month-cell {
  min-height: 78px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--white);
  padding: 7px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.month-cell.dim {
  opacity: 0.42;
}

.month-cell.today {
  border-color: var(--orange);
}

.month-num {
  font: 700 12px 'DM Sans', sans-serif;
}

.month-free {
  font-size: 10px;
  color: var(--muted);
}

.res-block {
  background: #fdeadd;
  color: var(--orange-dark);
  border-radius: 7px;
  padding: 4px 6px;
  font-size: 10px;
  margin-bottom: 4px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 22px 0 12px;
}

.section-head h2 {
  font-size: 15px;
  margin: 0;
}
</style>
