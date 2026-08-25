<script setup lang="ts">
import { ref } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk, toastErr } from '@/composables/useToast'
import BaseModal from '@/components/BaseModal.vue'
import * as membersApi from '@/api/members'
import * as demo from '@/api/demo'
import { useFetch } from '@/composables/useFetch'
import { initials } from '@/utils/format'

const tab = ref<'studio' | 'members' | 'roles'>('members')

const members = useFetch(() => membersApi.listUsers(), () => demo.demoUsersPage())
const roles = useFetch(() => membersApi.listRoles(), () => demo.demoRoles)

const studio = ref({
  name: 'Audi Shiraz · 摄影工作室',
  city: '北京 · 朝阳大悦城',
  openAt: '09:30',
  closeAt: '21:00',
  weekdays: ['一', '二', '三', '四', '五', '六', '日'],
  depositeRatio: 20,
  rescheduleFreeHours: 72,
  weekDefault: '双休制（周一周二闭店）',
  phone: '138 0000 2874',
  email: 'hello@shotsu.studio'
})

function saveStudio() {
  toastOk('工作室设置已保存（演示）')
}

const inviteOpen = ref(false)
const inviteForm = ref({ username: '', nickname: '', mobile: '', password: '', role_id: 3 })

async function saveMember() {
  if (!inviteForm.value.username.trim() || !inviteForm.value.nickname.trim() || !inviteForm.value.mobile.trim()) {
    toastErr('请填写用户名、姓名与手机号')
    return
  }
  members.load()
  inviteOpen.value = false
  toastOk(`已邀请 ${inviteForm.value.nickname}（演示）`)
}

const statusTone: Record<number, string> = {
  1: 'status-ok',
  0: 'status-disabled'
}
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>工作室设置</h1>
        <p>基础信息、作息、成员与角色权限。</p>
      </div>
      <div class="page-actions">
        <button v-if="tab === 'members'" class="btn btn-primary" @click="inviteOpen = true">+ 邀请成员</button>
        <button v-else class="btn btn-primary" @click="saveStudio">保存设置</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'members' }" @click="tab = 'members'">成员与权限</button>
      <button class="tab" :class="{ active: tab === 'roles' }" @click="tab = 'roles'">角色</button>
      <button class="tab" :class="{ active: tab === 'studio' }" @click="tab = 'studio'">工作室信息</button>
    </div>

    <!-- 成员 -->
    <div v-if="tab === 'members'">
      <div v-if="members.source === 'demo'" class="data-source-tip">
        <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
        演示数据（后端未连接）。
      </div>
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>成员</th><th>角色</th><th>手机</th><th>状态</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="m in members.data?.list || []" :key="m.id">
                <td>
                  <div class="flex gap-6">
                    <span class="avatar">{{ initials(m.nickname || m.username) }}</span>
                    <span class="cell-main">{{ m.nickname || m.username }}</span>
                  </div>
                </td>
                <td><span class="tag">{{ m.role_id }}</span></td>
                <td>{{ m.mobile }}</td>
                <td>
                  <span class="pill" :class="statusTone[m.status]">
                    {{ m.status === 1 ? '正常' : '停用' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline" @click="toastOk('编辑成员（演示）')">编辑</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 角色 -->
    <div v-if="tab === 'roles'">
      <div v-for="r in roles.data || []" :key="r.id" class="list-card" style="align-items: flex-start">
        <div class="list-card-left">
          <div class="list-card-title">{{ r.name }} <span class="tag">{{ r.code }}</span></div>
          <div class="flex wrap gap-6 mt-12">
            <span class="tag" style="background: var(--lav); color: var(--lav-dark)">{{ r.remark }}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-outline" @click="toastOk('编辑角色（演示）')">编辑</button>
      </div>
    </div>

    <!-- 工作室信息 -->
    <div v-if="tab === 'studio'">
      <div class="card card-pad">
        <div class="form-grid form-grid-2" style="max-width: 720px">
          <div class="field">
            <label class="field-label">工作室名称</label>
            <input v-model="studio.name" class="input" />
          </div>
          <div class="field">
            <label class="field-label">位置</label>
            <input v-model="studio.city" class="input" />
          </div>
          <div class="field">
            <label class="field-label">营业开始</label>
            <input v-model="studio.openAt" class="input" type="time" />
          </div>
          <div class="field">
            <label class="field-label">营业结束</label>
            <input v-model="studio.closeAt" class="input" type="time" />
          </div>
          <div class="field">
            <label class="field-label">默认定金比例（%）</label>
            <input v-model.number="studio.depositeRatio" class="input" type="number" />
          </div>
          <div class="field">
            <label class="field-label">免取消费改期限（小时）</label>
            <input v-model.number="studio.rescheduleFreeHours" class="input" type="number" />
          </div>
          <div class="field" style="grid-column: 1 / -1">
            <label class="field-label">营业日</label>
            <div class="flex wrap gap-6" style="gap: 6px">
              <span
                v-for="d in ['一', '二', '三', '四', '五', '六', '日']"
                :key="d"
                class="tag"
                :style="{ background: studio.weekdays.includes(d) ? 'var(--mint)' : 'var(--cream)', color: studio.weekdays.includes(d) ? 'var(--mint-dark)' : 'var(--muted)' }"
              >
                {{ d }}
              </span>
            </div>
          </div>
          <div class="field">
            <label class="field-label">联系电话</label>
            <input v-model="studio.phone" class="input" />
          </div>
          <div class="field">
            <label class="field-label">联系邮箱</label>
            <input v-model="studio.email" class="input" />
          </div>
        </div>
      </div>
    </div>

    <BaseModal :open="inviteOpen" title="邀请成员" @close="inviteOpen = false">
      <form id="modal-form" class="form-grid" @submit.prevent="saveMember">
        <div class="field">
          <label class="field-label"><span class="req">*</span> 用户名</label>
          <input v-model="inviteForm.username" class="input" />
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 姓名</label>
          <input v-model="inviteForm.nickname" class="input" />
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 手机号</label>
          <input v-model="inviteForm.mobile" class="input" placeholder="13800002874" />
        </div>
        <div class="field">
          <label class="field-label"><span class="req">*</span> 密码</label>
          <input v-model="inviteForm.password" class="input" type="password" />
        </div>
        <div class="field">
          <label class="field-label">角色</label>
          <select v-model.number="inviteForm.role_id" class="select">
            <option v-for="r in roles.data || []" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
