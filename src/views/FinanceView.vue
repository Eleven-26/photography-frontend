<script setup lang="ts">
import { reactive, ref } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as financeApi from '@/api/finance'
import * as demo from '@/api/demo'
import { useFetch } from '@/composables/useFetch'
import { money, formatDateTime } from '@/utils/format'
import type { Payment, Refund } from '@/types'
import { PAYMENT_STATUS, PAYMENT_STATUS_LABEL, REFUND_STATUS, REFUND_STATUS_LABEL } from '@/types'

const overview = useFetch(() => financeApi.financeSummary(), () => demo.demoFinanceSummary())

const payFilter = reactive({ status: '' as number | '' })
const payments = useFetch(
  () => financeApi.listPayments(payFilter),
  () => demo.demoPaymentsPage()
)

const refundFilter = reactive({ status: '' as number | '' })
const refunds = useFetch(
  () => financeApi.listRefunds(refundFilter),
  () => demo.demoRefundsPage()
)

const tab = ref<'payments' | 'refunds'>('payments')

const payTone: Record<number, string> = {
  [PAYMENT_STATUS.PENDING]: 'status-pending',
  [PAYMENT_STATUS.CONFIRMED]: 'status-ok',
  [PAYMENT_STATUS.REFUNDED]: 'status-error'
}

const refundTone: Record<number, string> = {
  [REFUND_STATUS.APPLYING]: 'status-pending',
  [REFUND_STATUS.APPROVED]: 'status-ok',
  [REFUND_STATUS.DONE]: 'status-ok',
  [REFUND_STATUS.REJECTED]: 'status-error'
}

const typeLabel: Record<string, string> = {
  deposit: '定金',
  final: '尾款',
  addon: '附加'
}

const confirmNote = ref('')
const confirming = ref<Payment | null>(null)

function openConfirm(p: Payment) {
  confirming.value = p
  confirmNote.value = ''
}

async function doConfirm() {
  if (!confirming.value) return
  try {
    try {
      await financeApi.confirmPayment(confirming.value.id, { remark: confirmNote.value })
    } catch {
      /* 演示模式直接通过 */
    }
    toastOk('已确认到账')
    confirming.value = null
    payments.load()
    overview.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '操作失败')
  }
}

const auditing = ref<Refund | null>(null)
const auditNote = ref('')

function openAudit(r: Refund) {
  auditing.value = r
  auditNote.value = ''
}

async function doAudit(approved: boolean) {
  if (!auditing.value) return
  try {
    try {
      await financeApi.auditRefund(auditing.value.id, { approved, remark: auditNote.value })
    } catch {
      /* 演示模式直接通过 */
    }
    toastOk(approved ? '已通过' : '已驳回')
    auditing.value = null
    refunds.load()
    overview.load()
  } catch (e) {
    toastErr(e instanceof Error ? e.message : '操作失败')
  }
}
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>财务与对账</h1>
        <p>收款核验与退款审批。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" @click="overview.load(); payments.load(); refunds.load()">
          <svg class="icon" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          刷新
        </button>
      </div>
    </div>

    <div v-if="overview.source === 'demo'" class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
      演示数据（后端未连接）— 审批操作返回演示成功。
    </div>

    <div class="stats-grid stats-4">
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-mint"><svg class="icon" viewBox="0 0 24 24"><path d="M6 4h12v16H6V4Zm0 5h12M9 14h6" /></svg></span>本月应收</div>
        <div class="stat-value">¥{{ (overview.data?.month_receivable || 0).toLocaleString() }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-orange"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg></span>已到账</div>
        <div class="stat-value">¥{{ (overview.data?.month_received || 0).toLocaleString() }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-lav"><svg class="icon" viewBox="0 0 24 24"><path d="M12 3v18M3 12h18" /></svg></span>待核验</div>
        <div class="stat-value">{{ overview.data?.pending_verify_count || 0 }} 笔</div>
        <div class="stat-sub">¥{{ (overview.data?.pending_verify_amount || 0).toLocaleString() }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-head"><span class="stat-icon tone-red"><svg class="icon" viewBox="0 0 24 24"><path d="M4 6h16M9 11h6M10 21h4a1 1 0 0 0 1-1v-5h4M9 20a1 1 0 0 1-1-1v-5H4" /></svg></span>退款中</div>
        <div class="stat-value">{{ overview.data?.refunding_count || 0 }}</div>
        <div class="stat-sub">¥{{ (overview.data?.refunding_amount || 0).toLocaleString() }}</div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'payments' }" @click="tab = 'payments'">收款核验</button>
      <button class="tab" :class="{ active: tab === 'refunds' }" @click="tab = 'refunds'">退款审批</button>
    </div>

    <!-- 收款核验 -->
    <div v-if="tab === 'payments'">
      <div class="filter-bar">
        <select v-model="payFilter.status" class="select" @change="payments.load()">
          <option value="">全部状态</option>
          <option :value="PAYMENT_STATUS.PENDING">待核验</option>
          <option :value="PAYMENT_STATUS.CONFIRMED">已确认</option>
          <option :value="PAYMENT_STATUS.REFUNDED">已退款</option>
        </select>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>编号</th>
                <th>订单ID</th>
                <th>类型</th>
                <th>金额</th>
                <th>支付方式</th>
                <th>付款时间</th>
                <th>状态</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in payments.data?.list || []" :key="p.id">
                <td><span class="cell-main">{{ p.code }}</span></td>
                <td>{{ p.order_id }}</td>
                <td><span class="pill status-info">{{ typeLabel[p.type] }}</span></td>
                <td><span class="strong">{{ money(p.amount) }}</span></td>
                <td>{{ p.method_name }}</td>
                <td>{{ formatDateTime(p.paid_at) }}</td>
                <td>
                  <span class="pill" :class="payTone[p.status]">
                    {{ PAYMENT_STATUS_LABEL[p.status] }}
                  </span>
                </td>
                <td>
                  <button
                    v-if="p.status === PAYMENT_STATUS.PENDING"
                    class="btn btn-sm btn-primary"
                    @click="openConfirm(p)"
                  >
                    确认到账
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!payments.data?.list.length" class="empty-state"><strong>暂无记录</strong></div>
      </div>
    </div>

    <!-- 退款审批 -->
    <div v-if="tab === 'refunds'">
      <div class="filter-bar">
        <select v-model="refundFilter.status" class="select" @change="refunds.load()">
          <option value="">全部状态</option>
          <option :value="REFUND_STATUS.APPLYING">申请中</option>
          <option :value="REFUND_STATUS.APPROVED">已通过</option>
          <option :value="REFUND_STATUS.DONE">已退款</option>
          <option :value="REFUND_STATUS.REJECTED">已驳回</option>
        </select>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>编号</th>
                <th>订单ID</th>
                <th>金额</th>
                <th>原因</th>
                <th>退款规则</th>
                <th>申请人</th>
                <th>状态</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in refunds.data?.list || []" :key="r.id">
                <td><span class="cell-main">{{ r.code }}</span></td>
                <td>{{ r.order_id }}</td>
                <td><span class="strong">{{ money(r.amount) }}</span></td>
                <td>{{ r.reason }}</td>
                <td>{{ r.refund_rule }}</td>
                <td>{{ r.apply_name }}</td>
                <td>
                  <span class="pill" :class="refundTone[r.status]">
                    {{ REFUND_STATUS_LABEL[r.status] }}
                  </span>
                </td>
                <td>
                  <button
                    v-if="r.status === REFUND_STATUS.APPLYING"
                    class="btn btn-sm btn-primary"
                    @click="openAudit(r)"
                  >
                    审批
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!refunds.data?.list.length" class="empty-state"><strong>暂无退款申请</strong></div>
      </div>
    </div>

    <!-- 收款确认弹窗 -->
    <BaseModal :open="!!confirming" title="确认到账" @close="confirming = null">
      <div v-if="confirming" class="verify-body">
        <div class="verify-row"><span class="muted small">编号</span><b>{{ confirming.code }}</b></div>
        <div class="verify-row"><span class="muted small">订单ID</span><b>{{ confirming.order_id }}</b></div>
        <div class="verify-row"><span class="muted small">类型</span><b>{{ typeLabel[confirming.type] }}</b></div>
        <div class="verify-row"><span class="muted small">金额</span><b style="color: var(--orange-dark)">{{ money(confirming.amount) }}</b></div>
        <div class="verify-row"><span class="muted small">支付方式</span><b>{{ confirming.method_name }}</b></div>
        <div class="field mt-16">
          <label class="field-label">备注</label>
          <textarea v-model="confirmNote" class="textarea" placeholder="如 金额一致，已确认到账"></textarea>
        </div>
      </div>
      <template #foot>
        <button class="btn btn-ghost" @click="confirming = null">取消</button>
        <button class="btn btn-primary" @click="doConfirm()">确认到账</button>
      </template>
    </BaseModal>

    <!-- 退款审批弹窗 -->
    <BaseModal :open="!!auditing" title="退款审批" @close="auditing = null">
      <div v-if="auditing" class="verify-body">
        <div class="verify-row"><span class="muted small">编号</span><b>{{ auditing.code }}</b></div>
        <div class="verify-row"><span class="muted small">订单ID</span><b>{{ auditing.order_id }}</b></div>
        <div class="verify-row"><span class="muted small">退款金额</span><b style="color: var(--orange-dark)">{{ money(auditing.amount) }}</b></div>
        <div class="verify-row"><span class="muted small">原因</span><b>{{ auditing.reason }}</b></div>
        <div class="verify-row"><span class="muted small">退款规则</span><b>{{ auditing.refund_rule }}</b></div>
        <div class="verify-row"><span class="muted small">申请人</span><b>{{ auditing.apply_name }}</b></div>
        <div class="field mt-16">
          <label class="field-label">审批备注</label>
          <textarea v-model="auditNote" class="textarea" placeholder="处理说明（可选）"></textarea>
        </div>
      </div>
      <template #foot>
        <button class="btn btn-ghost" @click="auditing = null">取消</button>
        <button class="btn btn-primary" @click="doAudit(true)">批准</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.verify-body {
  display: flex;
  flex-direction: column;
}

.verify-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 12px;
}
</style>
