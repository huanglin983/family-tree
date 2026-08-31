import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, type FamilySummary, type Member, type TreeNode } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref(false)
  const username = ref('')

  async function fetchMe() {
    const { data } = await api.me()
    authenticated.value = !!data.authenticated
    username.value = data.username || ''
  }

  async function login(user: string, pass: string) {
    const { data } = await api.login(user, pass)
    authenticated.value = true
    username.value = data.username
  }

  async function logout() {
    try {
      await api.logout()
    } finally {
      authenticated.value = false
      username.value = ''
    }
  }

  return { authenticated, username, fetchMe, login, logout }
})

export const useFamilyStore = defineStore('family', () => {
  const summary = ref<FamilySummary | null>(null)
  const members = ref<Member[]>([])
  const roots = ref<TreeNode[]>([])
  const events = ref<Record<string, unknown>[]>([])
  const photos = ref<Record<string, unknown>[]>([])
  const loading = ref(false)

  async function loadSummary() {
    const { data } = await api.family()
    summary.value = data
    document.title = data.family?.name ? `${data.family.name} · 家族族谱` : '家族族谱'
  }

  async function loadMembers() {
    const { data } = await api.members()
    members.value = data
  }

  async function loadTree() {
    loading.value = true
    try {
      const { data } = await api.tree()
      roots.value = data.roots
    } finally {
      loading.value = false
    }
  }

  async function loadEvents() {
    const { data } = await api.events()
    events.value = data as Record<string, unknown>[]
  }

  async function loadPhotos() {
    const { data } = await api.photos()
    photos.value = data as Record<string, unknown>[]
  }

  return {
    summary,
    members,
    roots,
    events,
    photos,
    loading,
    loadSummary,
    loadMembers,
    loadTree,
    loadEvents,
    loadPhotos,
  }
})
