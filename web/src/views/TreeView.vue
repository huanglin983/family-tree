<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFamilyStore } from '@/stores'
import type { TreeNode } from '@/api'
import FamilyTreeChart from '@/components/FamilyTreeChart.vue'

const store = useFamilyStore()
const router = useRouter()

onMounted(() => {
  store.loadTree()
  store.loadSummary()
})

/** 转为 vue3-tree-org 数据格式（单根对象） */
const chartData = computed(() => {
  const roots = store.roots
  if (!roots.length) return { id: 0, label: '暂无数据', children: [] }
  if (roots.length === 1) return mapNode(roots[0])
  return {
    id: -1,
    label: store.summary?.family.name || '家族',
    children: roots.map(mapNode),
  }
})

function mapNode(n: TreeNode): Record<string, unknown> {
  const spouseNames = n.spouses.map((s) => s.name).join('、')
  return {
    id: n.id,
    label: n.name,
    gender: n.gender,
    birth_date: n.birth_date,
    death_date: n.death_date,
    is_deceased: n.is_deceased,
    generation: n.generation,
    expand: true,
    $$data: n,
    spouseLabel: spouseNames,
    children: n.children.map(mapNode),
  }
}

function onNodeClick(node: { id?: number; $$data?: TreeNode }) {
  const id = node.$$data?.id ?? node.id
  if (id && id > 0) {
    router.push(`/members/${id}`)
  }
}
</script>

<template>
  <div class="tree-page">
    <div class="tree-toolbar">
      <h1>世系图</h1>
      <p class="muted">左侧为「N世」代数 · 双指/滚轮缩放 · 拖动画布 · 点击成员查看档案</p>
    </div>
    <van-loading v-if="store.loading" class="loading" vertical>加载族谱…</van-loading>
    <FamilyTreeChart v-else :data="chartData" @node-click="onNodeClick" />
  </div>
</template>

<style scoped>
.tree-page {
  height: calc(100vh - 50px);
  height: calc(100dvh - 50px);
  display: flex;
  flex-direction: column;
  touch-action: none;
}
.tree-toolbar {
  padding: 12px 16px 8px;
  flex-shrink: 0;
}
.tree-toolbar h1 {
  margin: 0;
  font-size: 1.15rem;
}
.loading {
  margin: 48px auto;
}
</style>
