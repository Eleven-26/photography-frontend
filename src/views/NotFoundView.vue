<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.replace('/dashboard')
}
</script>

<template>
  <div class="notfound-wrap">
    <div class="card notfound-card">
      <div class="notfound-code">404</div>
      <h2 class="notfound-title">页面不存在</h2>
      <p class="muted">你访问的地址不存在或已被移动，请检查链接是否正确。</p>
      <div class="notfound-actions">
        <button class="btn btn-primary" @click="goHome">返回工作台</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notfound-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--cream, #faf7f2);
}

.notfound-card {
  max-width: 460px;
  width: 100%;
  padding: 40px 32px;
  text-align: center;
}

.notfound-code {
  font-size: 64px;
  font-weight: 800;
  line-height: 1;
  color: var(--orange, #e08a3c);
  letter-spacing: 2px;
}

.notfound-title {
  margin: 16px 0 10px;
  font-size: 20px;
  color: var(--ink, #222);
}

.notfound-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 26px;
}
</style>
