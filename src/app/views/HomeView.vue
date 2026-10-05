<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, LogOut } from '@lucide/vue'
import { modules } from '@/app/modules'
import { useAuthStore } from '@/core/stores/auth'
import { useProfilesStore } from '@/core/stores/profiles'
import { formatToday } from '@/core/format'
import Avatar from '@/core/components/Avatar.vue'
import BaxWordmark from '@/core/components/BaxWordmark.vue'
import BottomSheet from '@/core/components/BottomSheet.vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import PageShell from '@/core/components/PageShell.vue'
import SheetAction from '@/core/components/SheetAction.vue'

const auth = useAuthStore()
const profiles = useProfilesStore()

const accountOpen = ref(false)
const active = computed(() => modules.filter((m) => m.status === 'active'))
const soon = computed(() => modules.filter((m) => m.status === 'soon'))
</script>

<template>
  <PageShell>
    <header class="flex h-14 items-center justify-between">
      <BaxWordmark />
      <button
        v-if="profiles.me"
        type="button"
        class="rounded-full"
        aria-label="Mon compte"
        @click="accountOpen = true"
      >
        <Avatar :profile-id="profiles.me.id" size="lg" />
      </button>
    </header>

    <h1 class="mt-6 text-[32px] leading-tight font-extrabold tracking-tight">
      Bonjour {{ profiles.me?.first_name ?? '' }}
    </h1>
    <p class="text-ink-soft">{{ formatToday() }}</p>

    <OfflineNotice class="mt-5" />

    <div class="mt-6 space-y-3">
      <template v-for="module in active" :key="module.id">
        <component :is="module.homeCard" v-if="module.homeCard" />
        <RouterLink v-else :to="module.to ?? '/'" class="card flex items-center gap-4 p-4">
          <span class="flex size-12 items-center justify-center rounded-2xl bg-ink text-on-ink">
            <component :is="module.icon" :size="22" />
          </span>
          <span class="flex-1">
            <span class="block font-display text-xl font-bold">{{ module.name }}</span>
            <span v-if="module.summary?.()" class="text-sm text-ink-soft">{{ module.summary() }}</span>
          </span>
          <ChevronRight :size="20" class="text-ink-soft" />
        </RouterLink>
      </template>

      <div v-if="soon.length" class="grid grid-cols-2 gap-3">
        <div
          v-for="module in soon"
          :key="module.id"
          class="rounded-3xl border-[1.5px] border-dashed border-line p-4"
          :aria-label="`${module.name} : bientôt`"
        >
          <span class="flex size-12 items-center justify-center rounded-2xl bg-sunken text-ink-soft">
            <component :is="module.icon" :size="20" />
          </span>
          <p class="mt-3 font-display text-lg font-bold text-ink-soft">{{ module.name }}</p>
          <span
            class="mt-2 inline-block rounded-md bg-sunken px-2 py-1 text-[11px] font-bold tracking-wide text-ink-soft"
          >
            BIENTÔT
          </span>
        </div>
      </div>
    </div>

    <BottomSheet :open="accountOpen" :title="profiles.me?.first_name" @close="accountOpen = false">
      <SheetAction :icon="LogOut" label="Se déconnecter" @click="auth.signOut()" />
    </BottomSheet>
  </PageShell>
</template>
