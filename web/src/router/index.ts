import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { tabbar: true },
    },
    {
      path: '/tree',
      name: 'tree',
      component: () => import('@/views/TreeView.vue'),
      meta: { tabbar: true },
    },
    {
      path: '/members/:id',
      name: 'member',
      component: () => import('@/views/MemberDetailView.vue'),
      meta: { tabbar: true },
    },
    {
      path: '/events',
      name: 'events',
      component: () => import('@/views/EventsView.vue'),
      meta: { tabbar: true },
    },
    {
      path: '/album',
      name: 'album',
      component: () => import('@/views/AlbumView.vue'),
      meta: { tabbar: true },
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/admin/LoginView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/admin/AdminHome.vue'),
      meta: { auth: true },
    },
    {
      path: '/admin/members',
      name: 'admin-members',
      component: () => import('@/views/admin/MembersAdmin.vue'),
      meta: { auth: true },
    },
    {
      path: '/admin/events',
      name: 'admin-events',
      component: () => import('@/views/admin/EventsAdmin.vue'),
      meta: { auth: true },
    },
    {
      path: '/admin/photos',
      name: 'admin-photos',
      component: () => import('@/views/admin/PhotosAdmin.vue'),
      meta: { auth: true },
    },
    {
      path: '/admin/backup',
      name: 'admin-backup',
      component: () => import('@/views/admin/BackupAdmin.vue'),
      meta: { auth: true },
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  if (!to.meta.auth) return true
  const auth = useAuthStore()
  if (!auth.authenticated) {
    await auth.fetchMe()
  }
  if (!auth.authenticated) {
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
