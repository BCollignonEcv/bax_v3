<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff, Lock, Mail } from '@lucide/vue'
import { useAuthStore } from '@/core/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  if (!email.value || !password.value) return
  loading.value = true
  error.value = await auth.signIn(email.value, password.value)
  loading.value = false
  if (!error.value) await router.replace({ name: 'home' })
}
</script>

<template>
  <main class="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col px-6">
    <div class="flex flex-1 flex-col items-center justify-center py-10 text-center">
      <img src="/icon.svg" alt="" class="size-24 rounded-[26px] shadow-xl" />
      <h1 class="mt-5 text-4xl font-extrabold tracking-tight">BAX</h1>
      <p class="mt-1 text-ink-soft">Notre petit QG à deux.</p>
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="label" for="email">E-mail</label>
        <div class="relative">
          <Mail
            :size="18"
            class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft"
          />
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="username"
            inputmode="email"
            placeholder="prenom@exemple.fr"
            class="field pl-11"
            required
          />
        </div>
      </div>
      <div>
        <label class="label" for="password">Mot de passe</label>
        <div class="relative">
          <Lock
            :size="18"
            class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft"
          />
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="••••••••"
            class="field px-11"
            required
          />
          <button
            type="button"
            class="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center text-ink-soft"
            :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
            @click="showPassword = !showPassword"
          >
            <component :is="showPassword ? EyeOff : Eye" :size="18" />
          </button>
        </div>
      </div>

      <p v-if="error" class="text-sm font-medium text-prio-high" role="alert">{{ error }}</p>

      <button type="submit" class="btn-primary mt-2 w-full" :disabled="loading">
        {{ loading ? 'Connexion…' : 'Se connecter' }}
      </button>
    </form>

    <p class="mt-6 mb-4 text-center text-sm text-ink-soft">
      Accès réservé à Baptiste et Alix.<br />
      Vous resterez connecté sur cet appareil.
    </p>
  </main>
</template>
