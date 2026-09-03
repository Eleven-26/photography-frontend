import { post, rpc } from './common/http'
import type { AuthUser, LoginParams, LoginResult } from '@/types'
import { API_PREFIX, API_PATHS } from './common/apiPath'

/** 登录 */
export async function login(params: LoginParams) {
  return await post<LoginResult>(`${API_PREFIX}${API_PATHS.auth.login}`, params)
}

/** 当前用户信息 */
export async function me() {
  return await rpc<AuthUser>(API_PATHS.user.profile)
}

export async function changePassword(old_password: string, new_password: string) {
  return await rpc<null>(API_PATHS.user.changePassword, { old_password, new_password })
}

export async function logout() {
  return await rpc<null>(API_PATHS.user.logout)
}
