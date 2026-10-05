<script setup lang="ts">
import { computed } from 'vue'
import { useProfilesStore } from '@/core/stores/profiles'

const props = withDefaults(defineProps<{ profileId: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const profiles = useProfilesStore()
const profile = computed(() => profiles.byId(props.profileId))
const initial = computed(() => profile.value?.first_name.charAt(0).toUpperCase() ?? '?')
</script>

<template>
  <span
    class="avatar inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-card"
    :class="{
      'size-6 text-[11px]': size === 'sm',
      'size-7 text-xs': size === 'md',
      'size-9 text-sm': size === 'lg',
    }"
    :style="{ '--avatar': profile?.color ?? '#7a7067' }"
    :title="profile?.first_name"
  >
    {{ initial }}
  </span>
</template>

<style scoped>
.avatar {
  background: var(--avatar);
  color: #fff;
}
@media (prefers-color-scheme: dark) {
  .avatar {
    background: color-mix(in srgb, var(--avatar) 55%, white);
    color: #15110e;
  }
}
</style>
