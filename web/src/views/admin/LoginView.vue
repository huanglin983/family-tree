<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const username = ref('admin')
const password = ref('')
const loading = ref(false)

async function submit() {
  loading.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    showToast('登录成功')
    const redirect = (route.query.redirect as string) || '/admin'
    router.replace(redirect)
  } catch {
    showToast('登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-admin">
    <h1 class="page-title">管理登录</h1>
    <p class="page-sub">本地账号，非微信登录</p>
    <van-form @submit="submit">
      <van-cell-group inset>
        <van-field v-model="username" name="username" label="账号" placeholder="管理员账号" />
        <van-field
          v-model="password"
          type="password"
          name="password"
          label="密码"
          placeholder="密码"
        />
      </van-cell-group>
      <div style="margin: 16px">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          登录
        </van-button>
      </div>
    </van-form>
    <van-button block plain hairline to="/">返回首页</van-button>
  </div>
</template>
