import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { clear as clearCache } from 'idb-keyval'
import { supabase } from '@/core/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const ready = ref(false)
  let initPromise: Promise<void> | null = null

  const userId = computed(() => session.value?.user.id ?? null)

  function init() {
    initPromise ??= (async () => {
      // La session est lue dans le stockage local : fonctionne aussi hors connexion.
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      supabase.auth.onAuthStateChange((_event, next) => {
        session.value = next
      })
      ready.value = true
    })()
    return initPromise
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      if (error.message.toLowerCase().includes('invalid')) return 'E-mail ou mot de passe incorrect.'
      return 'Connexion impossible pour le moment. Vérifiez votre réseau.'
    }
    session.value = data.session
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
    await clearCache()
    window.location.replace('/connexion')
  }

  return { session, ready, userId, init, signIn, signOut }
})
