<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showTabbar = computed(() => route.meta.tabbar === true)
</script>

<template>
  <div class="app-shell">
    <router-view />
    <van-tabbar v-if="showTabbar" route safe-area-inset-bottom>
      <van-tabbar-item replace to="/" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item replace to="/tree" icon="cluster-o">族谱</van-tabbar-item>
      <van-tabbar-item replace to="/events" icon="notes-o">大事记</van-tabbar-item>
      <van-tabbar-item replace to="/album" icon="photo-o">相册</van-tabbar-item>
    </van-tabbar>
  </div>
</template>
