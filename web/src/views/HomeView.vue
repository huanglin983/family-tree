<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFamilyStore } from '@/stores'

const store = useFamilyStore()
const router = useRouter()
const ready = ref(false)

onMounted(async () => {
  try {
    await store.loadSummary()
  } finally {
    ready.value = true
  }
})
</script>

<template>
  <div class="page home">
    <header class="hero">
      <p class="brand">家族族谱</p>
      <h1 class="page-title">{{ store.summary?.family.name || '加载中…' }}</h1>
      <p v-if="store.summary?.family.description" class="page-sub">{{ store.summary.family.description }}</p>
    </header>

    <div v-if="ready" class="stats">
      <div class="stat">
        <strong>{{ store.summary?.memberCount ?? 0 }}</strong>
        <span>成员</span>
      </div>
      <div class="stat">
        <strong>{{ store.summary?.eventCount ?? 0 }}</strong>
        <span>大事记</span>
      </div>
      <div class="stat">
        <strong>{{ store.summary?.photoCount ?? 0 }}</strong>
        <span>相册</span>
      </div>
    </div>

    <van-cell-group inset class="entries">
      <van-cell title="查看世系图" is-link to="/tree" label="按代际展开，可缩放浏览" />
      <van-cell title="大事记" is-link to="/events" label="婚嫁、迁徙、祭祖等" />
      <van-cell title="家族相册" is-link to="/album" label="图片列表与大图预览" />
      <van-cell title="管理端" is-link to="/admin" label="本地账号维护数据" />
    </van-cell-group>

    <p class="muted foot">微信内打开可转发链接分享给族人</p>
  </div>
</template>

<style scoped>
.hero {
  padding: 28px 8px 8px;
  animation: rise 0.6s ease-out;
}
.brand {
  margin: 0 0 6px;
  font-size: 0.8rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: var(--ft-accent);
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 8px 0 20px;
}
.stat {
  text-align: center;
  padding: 14px 8px;
  background: rgba(255, 252, 247, 0.7);
  border: 1px solid var(--ft-line);
  border-radius: 12px;
}
.stat strong {
  display: block;
  font-size: 1.4rem;
  color: var(--ft-accent);
}
.stat span {
  font-size: 0.75rem;
  color: var(--ft-muted);
}
.entries {
  overflow: hidden;
  border-radius: 12px;
}
.foot {
  text-align: center;
  margin-top: 24px;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
