import type { Component } from 'vue'
import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'

/** Déclaration d'un module de BAX. Ajouter un module = l'inscrire dans `modules.ts`. */
export interface BaxModule {
  id: string
  name: string
  icon: Component
  /** « soon » : carte « Bientôt » sur l'accueil, sans routes. */
  status: 'active' | 'soon'
  /** Routes du module, ajoutées automatiquement au routeur. */
  routes?: RouteRecordRaw[]
  /** Page d'entrée du module depuis l'accueil. */
  to?: RouteLocationRaw
  /** Carte personnalisée sur l'accueil (sinon : nom + indicateur). */
  homeCard?: Component
  /** Indicateur neutre affiché sous le nom, ex. « 3 projets en cours ». */
  summary?: () => string | null
  /** Appelé une fois après la connexion : relecture du cache, abonnements, chargement. */
  start?: () => Promise<void> | void
}
