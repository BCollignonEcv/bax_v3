<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Link, ShoppingCart } from '@lucide/vue'
import CheckBox from '@/core/components/CheckBox.vue'
import EmptyState from '@/core/components/EmptyState.vue'
import LinkifiedText from '@/core/components/LinkifiedText.vue'
import OfflineNotice from '@/core/components/OfflineNotice.vue'
import PageBar from '@/core/components/PageBar.vue'
import PageShell from '@/core/components/PageShell.vue'
import { formatMoney, plural } from '@/core/format'
import ItemOptionsLine from '../components/ItemOptionsLine.vue'
import ItemThumb from '../components/ItemThumb.vue'
import { useItemsStore } from '../stores/items'
import { useProjectsStore } from '../stores/projects'

const props = defineProps<{ projectId: string }>()

const store = useProjectsStore()
const items = useItemsStore()
const router = useRouter()

const project = computed(() => store.project(props.projectId))
const list = computed(() => items.shoppingList(props.projectId))
// Même règle de prix que le budget du projet (option retenue, prix propre, sinon la plus chère).
const estimated = computed(() => items.sumPrices(list.value.map(({ item }) => item)))

function openItem(itemId: string) {
  router.push({ name: 'item', params: { projectId: props.projectId, itemId } })
}

function taskTitle(id: string) {
  return store.task(id)?.title ?? ''
}
</script>

<template>
  <PageShell>
    <PageBar :back="`/projets/${projectId}`" />
    <p v-if="project" class="mt-2 text-sm font-semibold text-ink-soft">
      {{ project.icon }} {{ project.name }}
    </p>
    <h1 class="text-[32px] leading-tight font-extrabold tracking-tight">Liste de courses</h1>
    <p v-if="list.length" class="text-ink-soft">
      {{ plural(list.length, 'article à acheter', 'articles à acheter') }}
      <template v-if="estimated > 0"> · {{ formatMoney(estimated) }} estimés</template>
    </p>

    <OfflineNotice class="mt-4" />

    <EmptyState
      v-if="!list.length"
      :icon="ShoppingCart"
      title="Rien à acheter"
      text="Les articles ajoutés aux tâches en cours apparaîtront ici."
    />

    <TransitionGroup v-else tag="div" name="list" class="card mt-5 divide-y divide-line overflow-hidden">
      <div v-for="{ item, taskIds } in list" :key="item.id" class="flex items-center gap-1 py-3 pr-4 pl-1">
        <CheckBox
          :checked="item.purchased"
          :label="`Acheté : ${item.name}`"
          @click="items.togglePurchased(item.id, true)"
        />
        <ItemThumb :item-id="item.id" class="mr-2 cursor-pointer" @click="openItem(item.id)" />
        <!-- Zone cliquable vers la fiche (pas un lien : elle contient des liens) -->
        <div
          role="button"
          tabindex="0"
          class="min-w-0 flex-1 cursor-pointer py-1"
          :class="items.chosenImagePath(item.id) ? 'self-start' : 'self-center'"
          @click="openItem(item.id)"
          @keydown.enter.self="openItem(item.id)"
        >
          <p class="font-semibold">
            {{ item.name
            }}<span v-if="item.quantity && item.quantity > 1" class="font-normal text-ink-soft">
              ×{{ item.quantity }}</span
            >
          </p>
          <ItemOptionsLine :item-id="item.id" />
          <LinkifiedText v-if="item.note" :text="item.note" tag="p" class="text-sm text-ink-soft" />
          <RouterLink
            v-for="(taskId, i) in taskIds"
            :key="taskId"
            :to="{ name: 'task', params: { projectId, taskId } }"
            class="text-sm font-semibold text-ink-soft"
            @click.stop
          >
            {{ taskTitle(taskId) }}<template v-if="i < taskIds.length - 1"> · </template>
          </RouterLink>
          <span
            v-if="taskIds.length > 1"
            class="mt-1.5 flex w-fit items-center gap-1 rounded-md bg-doing-soft px-2 py-0.5 text-xs font-semibold text-doing"
          >
            <Link :size="12" /> {{ taskIds.length }} tâches
          </span>
        </div>
        <span
          v-if="items.displayPrice(item).amount != null"
          class="cursor-pointer py-1 text-right font-bold whitespace-nowrap"
          :class="items.chosenImagePath(item.id) ? 'self-start' : 'self-center'"
          @click="openItem(item.id)"
        >
          <span v-if="items.displayPrice(item).from" class="block text-xs font-semibold text-ink-soft"
            >à partir de</span
          >
          {{ formatMoney(items.displayPrice(item).amount!) }}
        </span>
      </div>
    </TransitionGroup>
  </PageShell>
</template>

<style scoped>
.list-leave-active {
  transition: opacity 0.25s ease;
}
.list-leave-to {
  opacity: 0;
}
</style>
