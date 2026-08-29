import { rpc } from './common/http'
import type { SysUser, SysRole, PageResult } from '@/types'

export function listUsers(params: Record<string, unknown> = {}) {
  return rpc<PageResult<SysUser>>('user', 'list', params)
}

export function createUser(data: Partial<SysUser> & { password?: string }) {
  return rpc<SysUser>('user', 'create', data)
}

export function updateUser(id: number, data: Partial<SysUser>) {
  return rpc<SysUser>('user', 'update', data, id)
}

export function deleteUser(id: number) {
  return rpc<null>('user', 'delete', {}, id)
}

export function listRoles(params: Record<string, unknown> = {}) {
  return rpc<SysRole[]>('role', 'list', params)
}

export function createRole(data: Partial<SysRole>) {
  return rpc<SysRole>('role', 'create', data)
}

export function updateRole(id: number, data: Partial<SysRole>) {
  return rpc<SysRole>('role', 'update', data, id)
}