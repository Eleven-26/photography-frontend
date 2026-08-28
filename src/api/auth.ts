import { post, rpc } from './http'
import type { AuthUser, LoginParams, LoginResult } from '@/types'
import { API_PATHS } from './common/constants' // ① 导入常量

/** 登录 — 公共接口，无 /pc 前缀 */
export async function login(params: LoginParams) {
  return await post<LoginResult>(API_PATHS.auth.login, params)
}

/** 当前用户信息 */
export async function me() {
  return await rpc<AuthUser>('user', 'profile')
}

export async function changePassword(old_password: string, new_password: string) {
  return await rpc<null>('user', 'change-password', { old_password, new_password })
}

export async function logout() {
  return await rpc<null>('user', 'logout')
}