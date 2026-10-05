<script setup lang="ts">
import { watch } from 'vue'
import { useAuthStore } from '@/core/stores/auth'
import { startApp } from '@/app/bootstrap'
import ToastHost from '@/core/components/ToastHost.vue'
import ConfirmHost from '@/core/components/ConfirmHost.vue'

const auth = useAuthStore()

watch(
  () => auth.session,
  (session) => {
    if (session) void startApp()
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
  <ToastHost />
  <ConfirmHost />
</template>
