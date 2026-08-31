<script setup lang="ts">
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { api } from '@/api'

const router = useRouter()

async function doExport() {
  const { data } = await api.exportBackup()
  const blob = data as Blob
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `family-tree-backup-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  showToast('已开始下载')
}

async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await showConfirmDialog({
    title: '导入将覆盖现有数据',
    message: '导入前服务端会自动落一份 pre-import 快照。确认继续？',
  })
  const text = await file.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    showToast('JSON 解析失败')
    return
  }
  await api.importBackup(json)
  showToast('导入成功')
  input.value = ''
}
</script>

<template>
  <div class="page-admin">
    <van-nav-bar title="数据备份" left-arrow @click-left="router.push('/admin')" />
    <p class="page-sub" style="padding: 0 16px">
      L1 应用级备份：导出 JSON。主机级备份请使用 server/scripts/backup.sh（见部署文档）。
    </p>
    <div style="padding: 8px 16px">
      <van-button type="primary" block @click="doExport">导出 JSON</van-button>
    </div>
    <div style="padding: 8px 16px">
      <van-button block plain type="danger" native-type="button">
        <label style="display: block; width: 100%">
          导入 JSON（覆盖）
          <input type="file" accept="application/json,.json" hidden @change="onImportFile" />
        </label>
      </van-button>
    </div>
  </div>
</template>
