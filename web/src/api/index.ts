/**
 * API 封装
 */
import axios from 'axios'
import { showToast } from 'vant'

export const http = axios.create({
  baseURL: '',
  timeout: 20000,
  withCredentials: true,
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || '请求失败'
    if (err.response?.status !== 401) {
      showToast(msg)
    }
    return Promise.reject(err)
  }
)

export interface FamilySummary {
  family: {
    id: number
    name: string
    description: string
    cover_photo: string
  }
  memberCount: number
  eventCount: number
  photoCount: number
}

export interface Member {
  id: number
  name: string
  gender: string
  birth_date: string
  death_date: string
  parent_id: number | null
  birth_order: number
  generation: number
  photo_url: string
  biography: string
  notes: string
  is_deceased: number
}

export interface TreeNode {
  id: number
  name: string
  gender: string
  birth_date: string
  death_date: string
  photo_url: string
  generation: number
  birth_order: number
  is_deceased: number
  spouses: { id: number; name: string; gender: string; photo_url: string }[]
  children: TreeNode[]
}

export const api = {
  health: () => http.get('/api/health'),
  family: () => http.get<FamilySummary>('/api/family'),
  updateFamily: (data: Partial<{ name: string; description: string; cover_photo: string }>) =>
    http.put('/api/family', data),
  members: () => http.get<Member[]>('/api/members'),
  member: (id: number) => http.get(`/api/members/${id}`),
  createMember: (data: Record<string, unknown>) => http.post('/api/members', data),
  updateMember: (id: number, data: Record<string, unknown>) => http.put(`/api/members/${id}`, data),
  deleteMember: (id: number) => http.delete(`/api/members/${id}`),
  tree: () => http.get<{ roots: TreeNode[] }>('/api/tree'),
  relationships: () => http.get('/api/relationships'),
  addSpouse: (member_a_id: number, member_b_id: number, note = '') =>
    http.post('/api/relationships', { member_a_id, member_b_id, note }),
  deleteRelationship: (id: number) => http.delete(`/api/relationships/${id}`),
  events: () => http.get('/api/events'),
  createEvent: (form: FormData) =>
    http.post('/api/events', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateEvent: (id: number, form: FormData) =>
    http.put(`/api/events/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteEvent: (id: number) => http.delete(`/api/events/${id}`),
  photos: () => http.get('/api/photos'),
  createPhoto: (form: FormData) =>
    http.post('/api/photos', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updatePhoto: (id: number, data: Record<string, unknown>) => http.put(`/api/photos/${id}`, data),
  deletePhoto: (id: number) => http.delete(`/api/photos/${id}`),
  login: (username: string, password: string) =>
    http.post('/api/auth/login', { username, password }),
  logout: () => http.post('/api/auth/logout'),
  me: () => http.get('/api/auth/me'),
  exportBackup: () => http.get('/api/backup/export', { responseType: 'blob' }),
  importBackup: (data: unknown) => http.post('/api/backup/import', data),
}
