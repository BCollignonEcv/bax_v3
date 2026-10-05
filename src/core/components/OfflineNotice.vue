<script setup lang="ts">
import { WifiOff } from '@lucide/vue'
import { useNetworkStore } from '@/core/stores/network'

const network = useNetworkStore()
</script>

<template>
  <div v-if="!network.online" class="flex gap-3 rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-soft">
    <WifiOff :size="18" class="mt-0.5 shrink-0" />
    <p>
      <strong class="text-ink">Hors connexion.</strong>
      Vous voyez la dernière version enregistrée. Les modifications reviendront avec le réseau.
    </p>
  </div>
</template>
