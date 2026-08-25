<script setup lang="ts">
import { toasts } from '@/composables/useToast'
</script>

<template>
  <Teleport to="body">
    <div class="toast-wrap">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="t.type"
        >
          <svg
            v-if="t.type === 'ok'"
            class="icon"
            viewBox="0 0 24 24"
          ><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
          <svg
            v-else-if="t.type === 'err'"
            class="icon"
            viewBox="0 0 24 24"
          ><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg>
          <span>{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-move,
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>