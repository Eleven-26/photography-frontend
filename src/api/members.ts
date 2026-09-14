import { rpc } from './common/http'
import type { SysUser, SysRole, PageResult, PermGroup, RolePerms, RoleGrantParams } from '@/types'
import { API_PATHS } from './common/apiPath'

/** 员工列表：筛选/分页参数走 POST body */
export function listUsers(params: Record<string, unknown> = {}) {
  return rpc<PageResult<SysUser>>(API_PATHS.user.list, params)
}

export function createUser(data: Partial<SysUser> & { password?: string }) {
  return rpc<SysUser>(API_PATHS.user.create, data)
}

export function updateUser(id: number, data: Partial<SysUser>) {
  return rpc<SysUser>(API_PATHS.user.update, { ...data, id })
}

export function deleteUser(id: number) {
  return rpc<null>(API_PATHS.user.delete, {}, id)
}

/** 角色列表（后端返回数组，非分页） */
export function listRoles(params: Record<string, unknown> = {}) {
  return rpc<SysRole[]>(API_PATHS.role.list, params)
}

export function createRole(data: Partial<SysRole>) {
  return rpc<SysRole>(API_PATHS.role.create, data)
}

export function updateRole(id: number, data: Partial<SysRole>) {
  return rpc<SysRole>(API_PATHS.role.update, { ...data, id })
}

export function deleteRole(id: number) {
  return rpc<null>(API_PATHS.role.delete, {}, id)
}

// ── RBAC 角色权限配置 ──────────────────────────────

/** 全量权限点清单（按业务模块分组），供权限勾选树渲染选项 */
export function roleCatalog() {
  return rpc<PermGroup[]>(API_PATHS.role.catalog)
}

/** 读取角色当前权限配置（数据范围 + 已选权限点），用于回显 */
export function rolePerms(id: number) {
  return rpc<RolePerms>(API_PATHS.role.permissions, {}, id)
}

/** 保存角色权限（全量覆盖：data_scope + permissions） */
export function grantRolePerms(id: number, data: RoleGrantParams) {
  return rpc<null>(API_PATHS.role.grant, data, id)
}
