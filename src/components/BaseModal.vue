<script setup lang="ts">
defineProps<{
  open: boolean
  title?: string
  width?: number
  foot?: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
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