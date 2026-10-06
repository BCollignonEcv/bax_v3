<script setup lang="ts" generic="T extends string">
defineProps<{
  options: { value: T; label: string }[]
  allowEmpty?: boolean
  /** Style de l'option active, par valeur (ex. « Terminé » en vert). */
  activeClass?: Partial<Record<T, string>>
}>()
const model = defineModel<T | null>({ required: true })
</script>

<template>
  <div class="flex rounded-2xl bg-sunken p-1">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-colors"
      :class="
        model === option.value
          ? (activeClass?.[option.value] ?? 'bg-card text-ink shadow-sm')
          : 'text-ink-soft'
      "
      :aria-pressed="model === option.value"
      @click="model = allowEmpty && model === option.value ? null : option.value"
    >
      <slot name="option" :option="option">{{ option.label }}</slot>
    </button>
  </div>
</template>
