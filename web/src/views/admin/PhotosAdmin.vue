<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { api, type Member } from '@/api'

const router = useRouter()
const photos = ref<Record<string, any>[]>([])
const members = ref<Member[]>([])
const title = ref('')
const takenAt = ref('')
const memberId = ref('')
const file = ref<File | null>(null)

async function refresh() {
  const [p, m] = await Promise.all([api.photos(), api.members()])
  photos.value = p.data as Record<string, any>[]
  members.value = m.data
}
onMounted(refresh)

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  file.value = input.files?.[0] || null
}

async function upload() {
  if (!file.value) {
    showToast('请选择图片')
    return
  }
  const fd = new FormData()
  fd.append('file', file.value)
  fd.append('title', title.value)
  fd.append('taken_at', takenAt.value)
  if (memberId.value) fd.append('member_id', memberId.value)
  await api.createPhoto(fd)
  showToast('上传成功')
  title.value = ''
  takenAt.value = ''
  memberId.value = ''
  file.value = null
  await refresh()
}

async function remove(p: Record<string, any>) {
  await showConfirmDialog({ title: '删除照片', message: '确认删除？' })
  await api.deletePhoto(Number(p.id))
  await refresh()
}
</script>

<template>
  <div class="page-admin">
    <van-nav-bar title="相册管理" left-arrow @click-left="router.push('/admin')" />
    <van-cell-group inset title="上传">
      <van-field v-model="title" label="标题" />
      <van-field v-model="takenAt" label="拍摄时间" />
      <van-field label="关联成员">
        <template #input>
          <select v-model="memberId" style="width: 100%; border: none">
            <option value="">无</option>
            <option v-for="m in members" :key="m.id" :value="String(m.id)">{{ m.name }}</option>
          </select>
        </template>
      </van-field>
      <van-field label="文件">
        <template #input>
          <input type="file" accept="image/jpeg,image/png,image/webp" @change="onFile" />
        </template>
      </van-field>
    </van-cell-group>
    <div style="padding: 12px 16px">
      <van-button type="primary" block @click="upload">上传</van-button>
    </div>
    <van-cell-group inset title="已有照片">
      <van-cell v-for="p in photos" :key="p.id" :title="p.title || p.url" :label="p.taken_at">
        <template #right-icon>
          <van-button size="mini" type="danger" plain @click="remove(p)">删</van-button>
        </template>
      </van-cell>
    </van-cell-group>
  </div>
</template>
