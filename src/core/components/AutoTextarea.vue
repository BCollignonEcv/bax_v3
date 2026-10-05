<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

const model = defineModel<string>({ required: true })
const el = ref<HTMLTextAreaElement>()

function resize() {
  const area = el.value
  if (!area) return
  area.style.height = 'auto'
  area.style.height = `${area.scrollHeight}px`
}

watch(model, () => nextTick(resize))
onMounted(resize)
</script>

<template>
  <textarea ref="el" v-model="model" rows="1" class="resize-none overflow-hidden" @input="resize" />
</template>
