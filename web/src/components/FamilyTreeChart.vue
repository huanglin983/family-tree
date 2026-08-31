<script setup lang="ts">
/**
 * 世系图节点组件
 * 分层：展示层；用途：vue3-tree-org 自定义节点 + 左侧「N世」代数标注
 * 创建：2026-08；维护：字段来自 TreeView mapNode 扁平字段 + $$data
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  birthYear,
  collectGenerations,
  genderLabel,
  generationLabel,
  isMemberNode,
  livingLabel,
} from '@/utils/treeNodeDisplay'

const props = defineProps<{
  data: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'node-click', node: Record<string, unknown>): void
}>()

const treeData = computed(() => props.data)
const generations = computed(() => collectGenerations(props.data))

const layoutRef = ref<HTMLElement | null>(null)
const chartRef = ref<HTMLElement | null>(null)

/** 各代数相对 layout 的垂直中心位置（与树节点行对齐） */
const genTops = ref<Record<number, number>>({})

let rafId = 0
let mo: MutationObserver | null = null
let ro: ResizeObserver | null = null

function scheduleSync() {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(syncGenTops)
}

function syncGenTops() {
  const layout = layoutRef.value
  const chart = chartRef.value
  if (!layout || !chart) return

  const layoutRect = layout.getBoundingClientRect()
  const nodes = chart.querySelectorAll<HTMLElement>('[data-gen]')
  const buckets = new Map<number, number[]>()

  nodes.forEach((el) => {
    const gen = Number(el.dataset.gen)
    if (!Number.isFinite(gen) || gen < 1) return
    const r = el.getBoundingClientRect()
    // 节点不可见或在缩放后塌缩时跳过
    if (r.height < 2 && r.width < 2) return
    const centerY = r.top + r.height / 2 - layoutRect.top
    const list = buckets.get(gen) || []
    list.push(centerY)
    buckets.set(gen, list)
  })

  const next: Record<number, number> = {}
  buckets.forEach((ys, gen) => {
    next[gen] = ys.reduce((a, b) => a + b, 0) / ys.length
  })
  genTops.value = next
}

function handleClick(_e: Event, node: Record<string, unknown>) {
  emit('node-click', node)
}

/** vue3-tree-org 槽位 node.$$data 为 mapNode 产出对象 */
function nodeData(node: Record<string, unknown>): Record<string, unknown> {
  const raw = node.$$data
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : node
}

function nodeGeneration(node: Record<string, unknown>): number {
  const d = nodeData(node)
  const g = Number(d.generation)
  return Number.isFinite(g) && g >= 1 ? g : 0
}

onMounted(() => {
  nextTick(() => {
    scheduleSync()
    const chart = chartRef.value
    if (!chart) return

    chart.addEventListener('wheel', scheduleSync, { passive: true })
    chart.addEventListener('touchmove', scheduleSync, { passive: true })
    chart.addEventListener('pointermove', scheduleSync)
    chart.addEventListener('pointerup', scheduleSync)

    mo = new MutationObserver(scheduleSync)
    mo.observe(chart, {
      attributes: true,
      subtree: true,
      attributeFilter: ['style', 'class'],
      childList: true,
    })

    ro = new ResizeObserver(scheduleSync)
    if (layoutRef.value) ro.observe(layoutRef.value)
    ro.observe(chart)
  })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  const chart = chartRef.value
  chart?.removeEventListener('wheel', scheduleSync)
  chart?.removeEventListener('touchmove', scheduleSync)
  chart?.removeEventListener('pointermove', scheduleSync)
  chart?.removeEventListener('pointerup', scheduleSync)
  mo?.disconnect()
  ro?.disconnect()
})

watch(
  () => props.data,
  () => nextTick(scheduleSync),
  { deep: true }
)
</script>

<template>
  <div ref="layoutRef" class="chart-layout">
    <aside class="gen-rail" aria-label="世代标注">
      <div
        v-for="g in generations"
        :key="g"
        class="gen-item"
        :class="{ placed: genTops[g] != null }"
        :style="genTops[g] != null ? { top: `${genTops[g]}px` } : undefined"
      >
        {{ generationLabel(g) }}
      </div>
    </aside>

    <div ref="chartRef" class="chart-wrap">
      <vue3-tree-org
        :data="treeData"
        :horizontal="false"
        :collapsable="true"
        :only-one-node="false"
        :clone-node-drag="false"
        :tool-bar="true"
        :scalable="true"
        :draggable="true"
        :default-expand-level="3"
        @on-node-click="handleClick"
      >
        <template #default="{ node }">
          <div
            class="ft-node"
            :data-gen="isMemberNode(nodeData(node)) ? nodeGeneration(node) || undefined : undefined"
            :class="{
              male: isMemberNode(nodeData(node)) && nodeData(node).gender === 'male',
              female: isMemberNode(nodeData(node)) && nodeData(node).gender === 'female',
              deceased:
                isMemberNode(nodeData(node)) &&
                (Number(nodeData(node).is_deceased) === 1 || Boolean(nodeData(node).death_date)),
            }"
          >
            <div
              v-if="isMemberNode(nodeData(node)) && generationLabel(nodeData(node).generation)"
              class="ft-gen"
            >
              {{ generationLabel(nodeData(node).generation) }}
            </div>
            <div class="ft-name-row">
              <span class="ft-name">{{ node.label }}</span>
              <span v-if="isMemberNode(nodeData(node))" class="ft-gender">
                {{ genderLabel(nodeData(node).gender) }}
              </span>
            </div>
            <div v-if="isMemberNode(nodeData(node))" class="ft-meta">
              <span v-if="birthYear(nodeData(node).birth_date)">
                生年 {{ birthYear(nodeData(node).birth_date) }}
              </span>
              <span v-if="birthYear(nodeData(node).birth_date)" class="ft-sep">·</span>
              <span
                class="ft-living"
                :class="{
                  gone:
                    Number(nodeData(node).is_deceased) === 1 || Boolean(nodeData(node).death_date),
                }"
              >
                {{ livingLabel(nodeData(node)) }}
              </span>
            </div>
            <div v-if="nodeData(node).spouseLabel" class="ft-spouse">
              配 {{ nodeData(node).spouseLabel }}
            </div>
          </div>
        </template>
      </vue3-tree-org>
    </div>
  </div>
</template>

<style scoped>
.chart-layout {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  overflow: hidden;
}

.gen-rail {
  position: relative;
  flex: 0 0 40px;
  width: 40px;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(90deg, rgba(243, 235, 224, 0.95), rgba(243, 235, 224, 0.4));
  border-right: 1px solid rgba(201, 184, 160, 0.55);
}

.gen-item {
  position: absolute;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--ft-ink);
  line-height: 1.2;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.gen-item.placed {
  opacity: 1;
}

.chart-wrap {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 24px,
      rgba(201, 184, 160, 0.15) 24px,
      rgba(201, 184, 160, 0.15) 25px
    ),
    rgba(255, 252, 247, 0.5);
}

.chart-wrap :deep(.zm-tree-org) {
  height: 100%;
}

.ft-node {
  position: relative;
  min-width: 108px;
  max-width: 148px;
  padding: 16px 10px 8px;
  border-radius: 8px;
  border: 1px solid var(--ft-line);
  background: #fffdf9;
  text-align: center;
  box-shadow: 0 2px 8px rgba(44, 36, 25, 0.06);
}

.ft-gen {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--ft-accent);
  line-height: 1;
  opacity: 0.85;
}

.ft-node.male {
  border-color: #8aa0b5;
}

.ft-node.female {
  border-color: #c49aa5;
}

.ft-node.deceased {
  background: #f7f4ef;
}

.ft-name-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.ft-name {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.2;
}

.ft-gender {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--ft-muted);
}

.ft-spouse {
  margin-top: 4px;
  font-size: 0.7rem;
  color: var(--ft-muted);
}

.ft-meta {
  margin-top: 4px;
  font-size: 0.68rem;
  color: var(--ft-muted);
  line-height: 1.3;
}

.ft-sep {
  margin: 0 2px;
}

.ft-living.gone {
  color: #8a7360;
}
</style>
