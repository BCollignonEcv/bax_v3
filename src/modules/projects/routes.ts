import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/projets', name: 'projects', component: () => import('./views/ProjectsListView.vue') },
  {
    path: '/projets/archives',
    name: 'projects-archived',
    component: () => import('./views/ArchivedProjectsView.vue'),
  },
  { path: '/projets/nouveau', name: 'project-new', component: () => import('./views/ProjectFormView.vue') },
  {
    path: '/projets/:projectId',
    name: 'project',
    component: () => import('./views/ProjectView.vue'),
    props: true,
  },
  {
    path: '/projets/:projectId/modifier',
    name: 'project-edit',
    component: () => import('./views/ProjectFormView.vue'),
    props: true,
  },
  {
    path: '/projets/:projectId/archives',
    name: 'project-archives',
    component: () => import('./views/ProjectArchivesView.vue'),
    props: true,
  },
  {
    path: '/projets/:projectId/courses',
    name: 'project-shopping',
    component: () => import('./views/ShoppingListView.vue'),
    props: true,
  },
  {
    path: '/projets/:projectId/taches/nouvelle',
    name: 'task-new',
    component: () => import('./views/TaskFormView.vue'),
    props: true,
  },
  {
    path: '/projets/:projectId/taches/:taskId',
    name: 'task',
    component: () => import('./views/TaskView.vue'),
    props: true,
  },
]
