import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { tokenStore } from '@/api/http'
import * as authApi from '@/api/auth'
import type { AuthUser, LoginParams } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(tokenStore.get())
  const user = ref<AuthUser | null>(null)

  const isLoggedIn = computed(() => !!token.value)

  function hasPerm(_perm: string): boolean {
    if (user.value?.role_code === 'admin') return true
    return true
  }

  async function login(params: LoginParams): Promise<AuthUser> {
    const res = await authApi.login(params)
    token.value = res.token
    user.value = res.user
    tokenStore.set(res.token)
    return res.user
  }

  async function fetchMe() {
    const res = await authApi.me()
    user.value = res
    return res
  }

  function logout() {
    token.value = null
    user.value = null
    tokenStore.clear()
  }

  return {
    token,
    user,
    isLoggedIn,
    hasPerm,
    login,
    fetchMe,
    logout
  }
})