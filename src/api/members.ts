import { rpc } from './common/http'
import type { SysUser, SysRole, PageResult } from '@/types'
import { API_PATHS } from './common/apiPath'

export function listUsers(params: Record<string, unknown> = {}) {
  return rpc<PageResult<SysUser>>(API_PATHS.user.list, params)
}

export function createUser(data: Partial<SysUser> & { password?: string }) {
  return rpc<SysUser>(API_PATHS.user.create, data)
}

export function updateUser(id: number, data: Partial<SysUser>) {
  return rpc<SysUser>(API_PATHS.user.update, data, id)
}

export function deleteUser(id: number) {
  return rpc<null>(API_PATHS.user.delete, {}, id)
}

export function listRoles(params: Record<string, unknown> = {}) {
  return rpc<SysRole[]>(API_PATHS.role.list, params)
}

export function createRole(data: Partial<SysRole>) {
  return rpc<SysRole>(API_PATHS.role.create, data)
}

export function updateRole(id: number, data: Partial<SysRole>) {
  return rpc<SysRole>(API_PATHS.role.update, data, id)
}
