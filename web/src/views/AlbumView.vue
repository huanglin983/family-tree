<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { showImagePreview } from 'vant'
import { useFamilyStore } from '@/stores'

const store = useFamilyStore()
onMounted(() => store.loadPhotos())

const urls = computed(() => store.photos.map((p) => String(p.url)))

function preview(index: number) {
  showImagePreview({ images: urls.value, startPosition: index })
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">家族相册</h1>
    <p class="page-sub">点击图片可大图预览</p>
    <van-empty v-if="!store.photos.length" description="暂无照片" />
    <div v-else class="grid">
      <button
        v-for="(p, i) in store.photos"
        :key="String(p.id)"
        type="button"
        class="shot"
        @click="preview(i)"
      >
        <img :src="String(p.url)" :alt="String(p.title || '照片')" loading="lazy" />
        <span v-if="p.title">{{ p.title }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.shot {
  margin: 0;
  padding: 0;
  border: 1px solid var(--ft-line);
  border-radius: 10px;
  overflow: hidden;
  background: #fffdf9;
  text-align: left;
  color: inherit;
}
.shot img {
  display: block;
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
}
.shot span {
  display: block;
  padding: 8px 10px;
  font-size: 0.8rem;
}
</style>
