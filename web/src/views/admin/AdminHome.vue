<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useFamilyStore } from '@/stores'

const auth = useAuthStore()
const store = useFamilyStore()
const router = useRouter()

onMounted(() => {
  store.loadSummary()
})

async function logout() {
  await auth.logout()
  router.replace('/admin/login')
}
</script>

<template>
  <div class="page-admin">
    <van-nav-bar title="管理端" left-text="首页" left-arrow @click-left="router.push('/')" />
    <p class="page-sub">你好，{{ auth.username }} · {{ store.summary?.family.name }}</p>
    <van-cell-group inset>
      <van-cell title="成员管理" is-link to="/admin/members?tab=members" label="增删改成员与父子关系" />
      <van-cell
        title="配偶关系"
        is-link
        to="/admin/members?tab=relations"
        label="现婚 / 离异等配偶维护"
      />
      <van-cell title="大事记" is-link to="/admin/events" />
      <van-cell title="相册" is-link to="/admin/photos" />
      <van-cell title="备份导入导出" is-link to="/admin/backup" />
    </van-cell-group>
    <div style="margin: 24px 16px">
      <van-button block type="danger" plain @click="logout">退出登录</van-button>
    </div>
  </div>
</template>
