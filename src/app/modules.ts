import { Utensils, Wallet } from '@lucide/vue'
import type { BaxModule } from './module'
import projects from '@/modules/projects'

/** Registre central : l'accueil et le routeur se construisent à partir de cette liste. */
export const modules: BaxModule[] = [
  projects,
  { id: 'budget', name: 'Budget', icon: Wallet, status: 'soon' },
  { id: 'meals', name: 'Repas', icon: Utensils, status: 'soon' },
]
