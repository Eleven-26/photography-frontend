import { ref } from 'vue'
import { studioGet } from '@/api/settings'
import type { StudioSetting } from '@/types'

/**
 * 工作室设置（含服务端下发的分享链接）—— 模块级缓存，一次会话只拉一次。
 *
 * 为什么不在页面里自己拼分享地址：
 *   `homepage_url` / `portfolio_url` 由后端按 `share.h5_base_url` + slug 拼装
 *   （见 photography-server → dto.NewStaffStudioSettingResp），域名只在 Nacos 配一处。
 *   前端若自己拼 `window.location.origin + '/h5/…'`，拼出来的是**管理端自己的域名**
 *   且该路由在管理端并不存在，复制出去的链接必然打不开。
 *
 * 多个页面需要它（作品集分享、预约入口分享），故缓存共享；失败**不置已加载**，
 * 下次进入页面可重试 —— 分享链接属可选增强，加载失败不打断页面主流程。
 */
const setting = ref<StudioSetting | null>(null)
const loading = ref(false)
let loaded = false

export function useStudioSetting() {
  async function load(force = false) {
    if (loading.value || (loaded && !force)) return
    loading.value = true
    try {
      setting.value = await studioGet()
      loaded = true
    } catch {
      /* 静默：页面按"链接不可用"给出兜底提示 */
    } finally {
      loading.value = false
    }
  }

  return { setting, loading, load }
}
