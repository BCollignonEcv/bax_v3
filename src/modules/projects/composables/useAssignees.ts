import { computed } from 'vue'
import { useProfilesStore } from '@/core/stores/profiles'

/** « both » = Nous deux, sinon l'id d'un profil, null = personne. */
export type AssigneeChoice = string | 'both' | null

export function useAssignees() {
  const profiles = useProfilesStore()

  const options = computed(() => [
    ...profiles.list.map((p) => ({ value: p.id, label: p.first_name, ids: [p.id] })),
    ...(profiles.list.length > 1 ? [{ value: 'both', label: 'Nous deux', ids: profiles.allIds }] : []),
  ])

  function toChoice(ids: string[]): AssigneeChoice {
    if (!ids.length) return null
    if (ids.length > 1) return 'both'
    return ids[0]!
  }

  function toIds(choice: AssigneeChoice): string[] {
    if (!choice) return []
    return choice === 'both' ? [...profiles.allIds] : [choice]
  }

  function label(ids: string[]) {
    const choice = toChoice(ids)
    return options.value.find((o) => o.value === choice)?.label ?? 'Personne'
  }

  return { options, toChoice, toIds, label }
}
