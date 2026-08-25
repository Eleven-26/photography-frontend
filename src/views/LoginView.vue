<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({ username: '', password: '' })
const busy = ref(false)
const error = ref('')
const hint = ref(
  '演示账号：admin / admin123456。后端为独立服务（Go · Gin），未启动时页面将通过演示数据运行。'
)

async function submit() {
  error.value = ''
  if (!form.username.trim() || !form.password) {
    error.value = '请输入用户名和密码'
    return
  }
  
  busy.value = true
  try {
    await auth.login({ username: form.username.trim(), password: form.password })
    const redirect = String(route.query.redirect || '')
    await router.replace(redirect && redirect.startsWith('/') ? redirect : '/dashboard')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败，请稍后重试'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <AppToast />
    <div class="login-brand">
      <div class="brand-mark lg">S</div>
      <div>
        <div class="brand-name">SLOT</div>
        <span class="brand-sub">STUDIO OS</span>
      </div>
    </div>

    <div class="login-card">
      <div class="eyebrow">Welcome back</div>
      <h1>主理人，欢迎回来</h1>
      <p class="sub">登录 SLOT 摄影师后台，管理订单、档期与经营。</p>

      <form @submit.prevent="submit">
        <div class="field">
          <label class="field-label" for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            class="input"
            type="text"
            autocomplete="username"
            placeholder="请输入用户名"
          />
        </div>

        <div class="field">
          <label class="field-label" for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            class="input"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
          />
        </div>

        <button class="btn btn-primary login-btn" type="submit" :disabled="busy">
          <svg v-if="busy" class="icon spin" viewBox="0 0 24 24">
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
          {{ busy ? '登录中…' : '登 录' }}
        </button>
      </form>

      <p v-if="error" class="login-error">{{ error }}</p>
      <div class="login-hint">{{ hint }}</div>
    </div>

    <p class="login-foot">SLOT Studio OS · 2026 · Photography Management</p>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 34px 20px;
  gap: 26px;
  background:
    radial-gradient(900px 500px at 85% -10%, rgba(233, 138, 75, 0.16), transparent 60%),
    radial-gradient(800px 500px at 0% 110%, rgba(63, 121, 103, 0.14), transparent 60%),
    var(--paper);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 13px;
}

.brand-mark.lg {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: var(--orange);
  color: var(--ink);
  font-family: Georgia, serif;
  font-size: 26px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.login-card {
  width: min(400px, 100%);
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: var(--shadow);
  padding: 30px 28px;
}

.login-card h1 {
  margin: 5px 0 0;
  font-family: 'Noto Serif SC', serif;
  font-size: 23px;
}

.sub {
  color: var(--muted);
  font-size: 12px;
  margin: 7px 0 22px;
}

.login-card .field {
  margin-bottom: 15px;
}

.login-btn {
  width: 100%;
  margin-top: 8px;
  padding: 11px;
  font-size: 13px;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-error {
  color: var(--red-dark);
  font-size: 12px;
  margin: 13px 0 0;
  background: #fdf1ef;
  border: 1px solid #f6d6d0;
  border-radius: 10px;
  padding: 9px 12px;
}

.login-hint {
  margin-top: 18px;
  font-size: 11px;
  color: var(--muted);
  background: var(--cream);
  border-radius: 10px;
  padding: 10px 12px;
  line-height: 1.6;
}

.login-foot {
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.12em;
}
</style>