<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title?: string
  width?: number
  foot?: boolean
}>(), {
  foot: true
})

defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <!--
      遮罩层（.modal-backdrop）承担两个职责：
      1. 视觉：压暗并模糊底下的页面，让弹窗成为唯一焦点；
      2. 交互：拦截点击 —— 点击弹窗外的遮罩区域**不关闭**弹窗。
         表单类弹窗（新增/编辑）常含未保存内容，误点空白处即关闭会丢数据，
         因此只保留「取消」按钮与右上角关闭按钮两条显式出口。
    -->
    <div v-if="open" class="modal-backdrop">
      <div class="modal" :style="{ maxWidth: width ? width + 'px' : undefined }">
        <div class="modal-head">
          <h3>{{ title }}</h3>
          <button class="modal-close" aria-label="关闭" @click="$emit('close')">
            <svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="foot !== false" class="modal-foot">
          <slot name="foot">
            <button class="btn btn-ghost" @click="$emit('close')">取消</button>
            <button class="btn btn-primary" type="submit" form="modal-form">保存</button>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>