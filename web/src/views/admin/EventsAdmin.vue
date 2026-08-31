<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showImagePreview, showToast } from 'vant'
import { api } from '@/api'

const router = useRouter()
const events = ref<Record<string, any>[]>([])
const showForm = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  title: '',
  event_type: 'other',
  event_date: '',
  description: '',
})
/** 已保存的图片 URL */
const keptImages = ref<string[]>([])
/** 待上传的新文件 */
const pendingFiles = ref<File[]>([])
const pendingPreviews = ref<string[]>([])

async function refresh() {
  const { data } = await api.events()
  events.value = data as Record<string, any>[]
}
onMounted(refresh)

function openCreate() {
  editingId.value = null
  Object.assign(form, { title: '', event_type: 'other', event_date: '', description: '' })
  keptImages.value = []
  clearPending()
  showForm.value = true
}

function openEdit(ev: Record<string, any>) {
  editingId.value = Number(ev.id)
  Object.assign(form, {
    title: ev.title,
    event_type: ev.event_type,
    event_date: ev.event_date,
    description: ev.description,
  })
  keptImages.value = Array.isArray(ev.image_urls) ? [...ev.image_urls] : []
  clearPending()
  showForm.value = true
}

function clearPending() {
  pendingPreviews.value.forEach((u) => URL.revokeObjectURL(u))
  pendingFiles.value = []
  pendingPreviews.value = []
}

function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const remain = 12 - keptImages.value.length - pendingFiles.value.length
  const take = files.slice(0, Math.max(0, remain))
  for (const f of take) {
    pendingFiles.value.push(f)
    pendingPreviews.value.push(URL.createObjectURL(f))
  }
  if (files.length > take.length) {
    showToast('单条大事记最多 12 张图')
  }
  input.value = ''
}

function removeKept(i: number) {
  keptImages.value.splice(i, 1)
}

function removePending(i: number) {
  URL.revokeObjectURL(pendingPreviews.value[i])
  pendingFiles.value.splice(i, 1)
  pendingPreviews.value.splice(i, 1)
}

function previewAll(start: number, urls: string[]) {
  if (!urls.length) return
  showImagePreview({ images: urls, startPosition: start })
}

async function save() {
  if (!form.title.trim()) {
    showToast('请填标题')
    return
  }
  const fd = new FormData()
  fd.append('title', form.title.trim())
  fd.append('event_type', form.event_type)
  fd.append('event_date', form.event_date)
  fd.append('description', form.description)
  fd.append('image_urls', JSON.stringify(keptImages.value))
  for (const f of pendingFiles.value) {
    fd.append('images', f)
  }
  if (editingId.value) {
    await api.updateEvent(editingId.value, fd)
  } else {
    await api.createEvent(fd)
  }
  showToast('已保存')
  showForm.value = false
  clearPending()
  await refresh()
}

async function remove(ev: Record<string, any>) {
  await showConfirmDialog({ title: '删除', message: `删除「${ev.title}」？` })
  await api.deleteEvent(Number(ev.id))
  await refresh()
}

function imageCount(ev: Record<string, any>) {
  return Array.isArray(ev.image_urls) ? ev.image_urls.length : 0
}
</script>

<template>
  <div class="page-admin">
    <van-nav-bar title="大事记管理" left-arrow @click-left="router.push('/admin')" />
    <div style="padding: 12px 16px">
      <van-button type="primary" size="small" @click="openCreate">新增事件</van-button>
    </div>
    <van-cell-group inset>
      <van-cell
        v-for="ev in events"
        :key="ev.id"
        :title="ev.title"
        :label="`${ev.event_date || '不详'} · ${ev.event_type}${imageCount(ev) ? ` · ${imageCount(ev)} 图` : ''}`"
      >
        <template #right-icon>
          <van-space>
            <van-button size="mini" @click="openEdit(ev)">编辑</van-button>
            <van-button size="mini" type="danger" plain @click="remove(ev)">删</van-button>
          </van-space>
        </template>
      </van-cell>
    </van-cell-group>

    <van-popup v-model:show="showForm" position="bottom" round :style="{ maxHeight: '90%' }">
      <div class="form">
        <van-field v-model="form.title" label="标题" />
        <van-field label="类型">
          <template #input>
            <select v-model="form.event_type" class="sel">
              <option value="marriage">婚嫁</option>
              <option value="migration">迁徙</option>
              <option value="ancestor_worship">祭祖</option>
              <option value="birth">出生</option>
              <option value="other">其他</option>
            </select>
          </template>
        </van-field>
        <van-field v-model="form.event_date" label="日期" />
        <van-field v-model="form.description" type="textarea" rows="3" label="描述" />

        <div class="img-block">
          <div class="img-hd">
            <span>图片（1～多张，最多 12）</span>
            <label class="upload-btn">
              添加图片
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden @change="onPickFiles" />
            </label>
          </div>
          <div class="thumbs">
            <div v-for="(url, i) in keptImages" :key="'k' + url" class="thumb">
              <img :src="url" alt="" @click="previewAll(i, keptImages)" />
              <button type="button" class="rm" @click="removeKept(i)">×</button>
            </div>
            <div v-for="(url, i) in pendingPreviews" :key="'p' + i" class="thumb">
              <img :src="url" alt="" />
              <button type="button" class="rm" @click="removePending(i)">×</button>
            </div>
          </div>
        </div>

        <van-button block type="primary" @click="save">保存</van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.form {
  padding: 16px;
  max-height: 85vh;
  overflow: auto;
}
.sel {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 14px;
}
.img-block {
  margin: 8px 0 16px;
  padding: 0 16px;
}
.img-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}
.upload-btn {
  color: #8b3a2a;
  font-size: 13px;
}
.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.thumb {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e6d9c8;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.rm {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  padding: 0;
}
</style>
