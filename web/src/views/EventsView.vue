<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { showImagePreview } from 'vant'
import { useFamilyStore } from '@/stores'

const store = useFamilyStore()
onMounted(() => store.loadEvents())

const typeMap: Record<string, string> = {
  marriage: '婚嫁',
  migration: '迁徙',
  ancestor_worship: '祭祖',
  birth: '出生',
  other: '其他',
}

const items = computed(() => store.events)

function imagesOf(ev: Record<string, unknown>): string[] {
  const raw = ev.image_urls
  if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === 'string')
  return []
}

function openPreview(urls: string[], index: number) {
  if (!urls.length) return
  showImagePreview({
    images: urls,
    startPosition: index,
    closeable: true,
  })
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">大事记</h1>
    <p class="page-sub">按时间记录家族重要事件</p>
    <van-empty v-if="!items.length" description="暂无大事记" />
    <van-steps v-else direction="vertical" :active="0" active-color="#8b3a2a">
      <van-step v-for="ev in items" :key="String(ev.id)">
        <h3>{{ ev.title }}</h3>
        <p class="muted">
          {{ ev.event_date || '年代不详' }} · {{ typeMap[String(ev.event_type)] || ev.event_type }}
        </p>
        <p v-if="ev.description">{{ ev.description }}</p>

        <div v-if="imagesOf(ev).length" class="gallery">
          <van-swipe
            :autoplay="0"
            indicator-color="#8b3a2a"
            lazy-render
            class="swipe"
          >
            <van-swipe-item v-for="(url, idx) in imagesOf(ev)" :key="url + idx">
              <button type="button" class="shot" @click="openPreview(imagesOf(ev), idx)">
                <img :src="url" :alt="String(ev.title)" loading="lazy" />
              </button>
            </van-swipe-item>
          </van-swipe>
          <p v-if="imagesOf(ev).length > 1" class="swipe-hint">左右滑动 · 点击全屏预览</p>
        </div>
      </van-step>
    </van-steps>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 4px;
  font-size: 1rem;
}
p {
  margin: 0 0 6px;
  line-height: 1.5;
}
.gallery {
  margin-top: 8px;
  margin-bottom: 4px;
}
.swipe {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--ft-line, #c9b8a0);
  background: #fffdf9;
}
.shot {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
}
.shot img {
  display: block;
  width: 100%;
  height: 180px;
  object-fit: cover;
}
.swipe-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #999;
}
</style>
