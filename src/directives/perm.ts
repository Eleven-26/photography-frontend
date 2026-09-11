// v-perm 按钮级权限指令。
//
// 用法：
//   <button v-perm="'order:delete'">删除</button>
//   <button v-perm="['order:update', 'order:status']">编辑</button>  // 任一命中即显示
//
// 语义与 auth.hasPerm 一致：admin 短路、未下发权限时放行（避免前后端不同步发布导致
// 界面大面积空白）。无权限时**移除元素**而非隐藏——v-if 语义，杜绝 DOM 残留被脚本读取。

import type { App, Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores/auth'

function allowed(binding: DirectiveBinding): boolean {
  const auth = useAuthStore()
  const value = binding.value
  if (value == null) return true
  if (Array.isArray(value)) return auth.hasAnyPerm(value as string[])
  if (typeof value === 'string') return auth.hasPerm(value)
  return true
}

const perm: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    if (!allowed(binding)) {
      el.parentNode?.removeChild(el)
    }
  }
}

export function setupPermDirective(app: App) {
  app.directive('perm', perm)
}

export default perm
