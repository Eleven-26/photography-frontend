import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { tokenStore } from '@/api/common/http'
import * as authApi from '@/api/auth'
import type { AuthUser, LoginParams } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(tokenStore.get())
  const user = ref<AuthUser | null>(null)

  const isLoggedIn = computed(() => !!token.value)

  /** 当前用户权限点集合（后端未下发时为空数组） */
  const permissions = computed<string[]>(() =>
    Array.isArray(user.value?.permissions) ? user.value!.permissions : []
  )

  /** 数据范围 1-全部 2-本门店 3-仅本人 */
  const dataScope = computed(() => user.value?.data_scope ?? 1)

  const isAdmin = computed(() => user.value?.role_code === 'admin')

  /**
   * 权限判定。
   *
   * 三条短路规则，保证「前后端不同步发布不白屏」：
   *   1. 用户信息尚未加载 → 放行（刷新瞬间 user 为空，此时拦截会误伤首屏）
   *   2. admin 角色 → 放行（后端同样按角色码短路给全权限）
   *   3. 后端未下发 permissions（旧版本接口）→ 放行
   *
   * 只有「已加载用户 + 非 admin + 确实下发了权限数组」时，才做真实拦截。
   */
  function hasPerm(perm: string): boolean {
    const u = user.value
    if (!u) return true
    if (u.role_code === 'admin') return true
    if (!Array.isArray(u.permissions)) return true
    return u.permissions.includes(perm)
  }

  /** 任一权限点命中即通过（空参数视为通过） */
  function hasAnyPerm(perms: string[]): boolean {
    if (!perms.length) return true
    return perms.some((p) => hasPerm(p))
  }

  /** 全部权限点命中才通过（空参数视为通过） */
  function hasAllPerm(perms: string[]): boolean {
    if (!perms.length) return true
    return perms.every((p) => hasPerm(p))
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
    permissions,
    dataScope,
    isAdmin,
    hasPerm,
    hasAnyPerm,
    hasAllPerm,
    login,
    fetchMe,
    logout
  }
})