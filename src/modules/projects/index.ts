import { ListChecks } from '@lucide/vue'
import type { BaxModule } from '@/app/module'
import { plural } from '@/core/format'
import { routes } from './routes'
import { useProjectsStore } from './stores/projects'
import { usePhotosStore } from './stores/photos'
import { useItemsStore } from './stores/items'
import { useOptionsStore } from './stores/options'
import { useSubtasksStore } from './stores/subtasks'
import ProjectsHomeCard from './components/ProjectsHomeCard.vue'

const projectsModule: BaxModule = {
  id: 'projects',
  name: 'Projets',
  icon: ListChecks,
  status: 'active',
  routes,
  to: { name: 'projects' },
  homeCard: ProjectsHomeCard,
  summary: () => plural(useProjectsStore().activeProjects.length, 'projet en cours', 'projets en cours'),
  async start() {
    await Promise.all([
      useProjectsStore().start(),
      usePhotosStore().start(),
      useItemsStore().start(),
      useOptionsStore().start(),
      useSubtasksStore().start(),
    ])
  },
}

export default projectsModule
