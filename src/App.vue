<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const auth = useAuthStore()

onMounted(() => {
  if (auth.token && !auth.user) {
    auth
      .fetchMe()
      .catch(() => {
        auth.logout()
        router.push('/login')
      })
  }
})
</script>

<template>
  <RouterView />
</template>