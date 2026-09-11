<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

function goHome() {
  router.replace('/dashboard')
}

function relogin() {
  auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="forbidden-wrap">
    <div class="card forbidden-card">
      <div class="forbidden-code">403</div>
      <h2 class="forbidden-title">无访问权限</h2>
      <p class="muted">
        你的角色（{{ auth.user?.role_name || '未识别' }}）没有该功能的访问权限。<br />
        如需开通，请联系工作室管理员在「工作室设置 · 角色」中调整权限。
      </p>
      <div class="forbidden-actions">
        <button class="btn btn-primary" @click="goHome">返回工作台</button>
        <button class="btn btn-outline" @click="relogin">重新登录</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forbidden-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--cream, #faf7f2);
}

.forbidden-card {
  max-width: 460px;
  width: 100%;
  padding: 40px 32px;
  text-align: center;
}

.forbidden-code {
  font-size: 64px;
  font-weight: 800;
  line-height: 1;
  color: var(--orange, #e08a3c);
  letter-spacing: 2px;
}

.forbidden-title {
  margin: 16px 0 10px;
  font-size: 20px;
  color: var(--ink, #222);
}

.forbidden-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 26px;
}
</style>
