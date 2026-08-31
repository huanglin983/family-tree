<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { api, type Member } from '@/api'

const router = useRouter()
const route = useRoute()

const activeTab = ref(route.query.tab === 'relations' ? 1 : 0)
const members = ref<Member[]>([])
const relationships = ref<{ id: number; member_a_id: number; member_b_id: number; note: string }[]>(
  []
)
const showForm = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  name: '',
  gender: 'male',
  birth_date: '',
  death_date: '',
  parent_id: '' as string | number,
  birth_order: 0,
  biography: '',
  notes: '',
  is_deceased: 0,
})
const spouseA = ref<number | undefined>()
const spouseB = ref<number | undefined>()
const spouseNote = ref('现婚')
const memberKeyword = ref('')
const relationKeyword = ref('')
const pickerKeyword = ref('')

const pickerOpen = ref(false)
const pickerMode = ref<'father' | 'spouseA' | 'spouseB'>('father')

watch(activeTab, (v) => {
  const tab = v === 1 ? 'relations' : 'members'
  if (route.query.tab !== tab) {
    router.replace({ query: { ...route.query, tab } })
  }
})

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = tab === 'relations' ? 1 : 0
  }
)

async function refresh() {
  const [m, r] = await Promise.all([api.members(), api.relationships()])
  members.value = m.data
  relationships.value = r.data as typeof relationships.value
}

onMounted(refresh)

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    name: '',
    gender: 'male',
    birth_date: '',
    death_date: '',
    parent_id: '',
    birth_order: 0,
    biography: '',
    notes: '',
    is_deceased: 0,
  })
  showForm.value = true
}

function openEdit(m: Member) {
  editingId.value = m.id
  Object.assign(form, {
    name: m.name,
    gender: m.gender,
    birth_date: m.birth_date,
    death_date: m.death_date,
    parent_id: m.parent_id ?? '',
    birth_order: m.birth_order,
    biography: m.biography,
    notes: m.notes,
    is_deceased: m.is_deceased,
  })
  showForm.value = true
}

async function save() {
  if (!form.name.trim()) {
    showToast('请填写姓名')
    return
  }
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    gender: form.gender,
    birth_date: form.birth_date,
    death_date: form.death_date,
    parent_id: form.parent_id === '' ? null : Number(form.parent_id),
    birth_order: Number(form.birth_order) || 0,
    biography: form.biography,
    notes: form.notes,
    is_deceased: Number(form.is_deceased) || 0,
  }
  if (editingId.value) {
    await api.updateMember(editingId.value, payload)
  } else {
    await api.createMember(payload)
  }
  showToast('已保存')
  showForm.value = false
  await refresh()
}

async function remove(m: Member) {
  await showConfirmDialog({ title: '删除成员', message: `确认删除 ${m.name}？` })
  await api.deleteMember(m.id)
  showToast('已删除')
  await refresh()
}

async function addSpouseRel() {
  if (!spouseA.value || !spouseB.value) {
    showToast('请选择双方')
    return
  }
  await api.addSpouse(spouseA.value, spouseB.value, spouseNote.value.trim())
  showToast('配偶关系已添加')
  spouseA.value = undefined
  spouseB.value = undefined
  spouseNote.value = '现婚'
  await refresh()
}

async function removeRel(id: number) {
  await showConfirmDialog({ title: '删除关系', message: '确认删除该配偶关系？' })
  await api.deleteRelationship(id)
  await refresh()
}

function findMember(id: number | string | undefined | null): Member | undefined {
  if (id === '' || id == null) return undefined
  return members.value.find((m) => m.id === Number(id))
}

function nameOf(id: number) {
  return findMember(id)?.name || String(id)
}

function memberMeta(m: Member): string {
  const parts: string[] = []
  if (m.birth_date) parts.push(`生年 ${m.birth_date}`)
  if (m.notes?.trim()) parts.push(m.notes.trim())
  return parts.join(' · ')
}

function relationshipLabel(r: { member_a_id: number; member_b_id: number; note: string }): string {
  const parts: string[] = []
  if (r.note?.trim()) parts.push(r.note.trim())
  const a = findMember(r.member_a_id)
  const b = findMember(r.member_b_id)
  if (a) {
    const meta = memberMeta(a)
    if (meta) parts.push(`${a.name}：${meta}`)
  }
  if (b) {
    const meta = memberMeta(b)
    if (meta) parts.push(`${b.name}：${meta}`)
  }
  return parts.join(' ｜ ')
}

function relationshipTitle(r: { member_a_id: number; member_b_id: number; note: string }): string {
  const base = `${nameOf(r.member_a_id)} ↔ ${nameOf(r.member_b_id)}`
  return r.note?.trim() ? `${base}（${r.note.trim()}）` : base
}

function memberDisplay(m: Member | undefined, empty = '请选择'): string {
  if (!m) return empty
  const meta = memberMeta(m)
  return meta ? `${m.name}（${meta}）` : m.name
}

function matchText(haystack: string, keyword: string): boolean {
  const q = keyword.trim().toLowerCase()
  if (!q) return true
  return haystack.toLowerCase().includes(q)
}

function memberMatches(m: Member, keyword: string): boolean {
  return matchText(
    [m.name, m.birth_date, m.death_date, m.notes, m.biography, `第${m.generation}代`].join(' '),
    keyword
  )
}

const filteredMembers = computed(() =>
  members.value.filter((m) => memberMatches(m, memberKeyword.value))
)

const filteredRelationships = computed(() => {
  const q = relationKeyword.value.trim()
  if (!q) return relationships.value
  return relationships.value.filter((r) => {
    const a = findMember(r.member_a_id)
    const b = findMember(r.member_b_id)
    const blob = [
      r.note,
      a?.name,
      a?.birth_date,
      a?.notes,
      b?.name,
      b?.birth_date,
      b?.notes,
      relationshipTitle(r),
    ]
      .filter(Boolean)
      .join(' ')
    return matchText(blob, q)
  })
})

const pickerTitle = computed(() => {
  if (pickerMode.value === 'father') return '选择父亲'
  if (pickerMode.value === 'spouseA') return '选择成员 A'
  return '选择成员 B'
})

const pickerCandidates = computed(() => {
  let list = members.value
  if (pickerMode.value === 'father' && editingId.value != null) {
    list = list.filter((m) => m.id !== editingId.value)
  }
  return list.filter((m) => memberMatches(m, pickerKeyword.value))
})

function openPicker(mode: 'father' | 'spouseA' | 'spouseB') {
  pickerMode.value = mode
  pickerKeyword.value = ''
  pickerOpen.value = true
}

function pickNone() {
  if (pickerMode.value === 'father') form.parent_id = ''
  pickerOpen.value = false
}

function pickMember(m: Member) {
  if (pickerMode.value === 'father') form.parent_id = m.id
  else if (pickerMode.value === 'spouseA') spouseA.value = m.id
  else spouseB.value = m.id
  pickerOpen.value = false
}

function clearSpouse(which: 'A' | 'B') {
  if (which === 'A') spouseA.value = undefined
  else spouseB.value = undefined
}
</script>

<template>
  <div class="page-admin">
    <van-nav-bar title="族谱维护" left-arrow @click-left="router.push('/admin')" />

    <van-tabs v-model:active="activeTab" sticky shrink color="#8b3a2a" title-active-color="#8b3a2a">
      <van-tab title="成员管理">
        <div class="tab-pane">
          <div class="toolbar">
            <van-button type="primary" size="small" @click="openCreate">新增成员</van-button>
          </div>
          <van-search
            v-model="memberKeyword"
            shape="round"
            placeholder="搜索成员：姓名 / 生年 / 备注"
            clearable
          />
          <p v-if="memberKeyword.trim()" class="search-hint">
            找到 {{ filteredMembers.length }} / {{ members.length }} 人
          </p>
          <van-cell-group inset>
            <van-empty v-if="!filteredMembers.length" description="无匹配成员" />
            <van-cell
              v-for="m in filteredMembers"
              :key="m.id"
              :title="m.name"
              :label="
                [m.birth_date && `生年 ${m.birth_date}`, m.notes?.trim(), `第${m.generation}代`]
                  .filter(Boolean)
                  .join(' · ')
              "
            >
              <template #right-icon>
                <van-space>
                  <van-button size="mini" @click="openEdit(m)">编辑</van-button>
                  <van-button size="mini" type="danger" plain @click="remove(m)">删</van-button>
                </van-space>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </van-tab>

      <van-tab title="配偶关系">
        <div class="tab-pane">
          <van-search
            v-model="relationKeyword"
            shape="round"
            placeholder="搜索关系：姓名 / 现婚·离异 / 备注"
            clearable
          />
          <p v-if="relationKeyword.trim()" class="search-hint">
            找到 {{ filteredRelationships.length }} / {{ relationships.length }} 条
          </p>

          <van-cell-group inset title="添加配偶">
            <van-field
              label="成员A"
              is-link
              readonly
              :model-value="memberDisplay(findMember(spouseA))"
              placeholder="请选择"
              @click="openPicker('spouseA')"
            >
              <template v-if="spouseA" #button>
                <van-button size="mini" plain type="default" @click.stop="clearSpouse('A')">
                  清空
                </van-button>
              </template>
            </van-field>
            <van-field
              label="成员B"
              is-link
              readonly
              :model-value="memberDisplay(findMember(spouseB))"
              placeholder="请选择"
              @click="openPicker('spouseB')"
            >
              <template v-if="spouseB" #button>
                <van-button size="mini" plain type="default" @click.stop="clearSpouse('B')">
                  清空
                </van-button>
              </template>
            </van-field>
            <van-field
              v-model="spouseNote"
              label="关系备注"
              placeholder="如：现婚、离异、丧偶"
              maxlength="40"
              show-word-limit
            />
            <van-field label="快捷">
              <template #input>
                <div class="note-chips">
                  <button
                    v-for="tag in ['现婚', '离异', '丧偶']"
                    :key="tag"
                    type="button"
                    class="chip"
                    :class="{ active: spouseNote === tag }"
                    @click="spouseNote = tag"
                  >
                    {{ tag }}
                  </button>
                </div>
              </template>
            </van-field>
          </van-cell-group>
          <div class="toolbar">
            <van-button size="small" type="primary" block @click="addSpouseRel">添加配偶</van-button>
          </div>

          <van-cell-group inset title="已有关系">
            <van-empty v-if="!filteredRelationships.length" description="无匹配关系" />
            <van-cell
              v-for="r in filteredRelationships"
              :key="r.id"
              :title="relationshipTitle(r)"
              :label="relationshipLabel(r)"
            >
              <template #right-icon>
                <van-button size="mini" type="danger" plain @click="removeRel(r.id)">删</van-button>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </van-tab>
    </van-tabs>

    <van-popup v-model:show="showForm" position="bottom" round :style="{ maxHeight: '85%' }">
      <div class="form">
        <h3>{{ editingId ? '编辑成员' : '新增成员' }}</h3>
        <van-field v-model="form.name" label="姓名" required />
        <van-field label="性别">
          <template #input>
            <select v-model="form.gender" class="sel">
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="unknown">未知</option>
            </select>
          </template>
        </van-field>
        <van-field v-model="form.birth_date" label="生年" placeholder="YYYY / YYYY-MM" />
        <van-field v-model="form.death_date" label="卒年" />
        <van-field
          label="父亲"
          is-link
          readonly
          :model-value="
            form.parent_id === '' || form.parent_id == null
              ? '无（始祖/配偶入谱）'
              : memberDisplay(findMember(form.parent_id), '无（始祖/配偶入谱）')
          "
          @click="openPicker('father')"
        />
        <van-field v-model.number="form.birth_order" type="digit" label="排行" />
        <van-field v-model="form.biography" rows="2" autosize type="textarea" label="简介" />
        <van-field v-model="form.notes" rows="2" autosize type="textarea" label="备注" />
        <van-field label="已故">
          <template #input>
            <select v-model.number="form.is_deceased" class="sel">
              <option :value="0">否</option>
              <option :value="1">是</option>
            </select>
          </template>
        </van-field>
        <van-button block type="primary" @click="save">保存</van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="pickerOpen" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="picker">
        <div class="picker-hd">
          <span>{{ pickerTitle }}</span>
          <van-button size="mini" plain @click="pickerOpen = false">关闭</van-button>
        </div>
        <van-search
          v-model="pickerKeyword"
          shape="round"
          placeholder="搜索姓名 / 生年 / 备注"
          clearable
        />
        <button
          v-if="pickerMode === 'father' && !pickerKeyword.trim()"
          type="button"
          class="picker-item"
          @click="pickNone"
        >
          <div class="picker-name">无（始祖/配偶入谱）</div>
        </button>
        <button
          v-for="m in pickerCandidates"
          :key="m.id"
          type="button"
          class="picker-item"
          @click="pickMember(m)"
        >
          <div class="picker-name">{{ m.name }}</div>
          <div v-if="memberMeta(m)" class="picker-meta">{{ memberMeta(m) }}</div>
        </button>
        <van-empty v-if="!pickerCandidates.length" description="无匹配成员" />
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.tab-pane {
  padding-bottom: 24px;
}
.toolbar {
  padding: 12px 16px;
}
.search-hint {
  margin: 0 16px 8px;
  font-size: 12px;
  color: #999;
}
.form {
  padding: 16px;
  max-height: 80vh;
  overflow: auto;
}
.sel {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 14px;
}
.picker {
  padding: 8px 0 calc(16px + env(safe-area-inset-bottom));
  max-height: 70vh;
  overflow: auto;
}
.picker-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 12px;
  font-weight: 600;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}
.picker-item {
  display: block;
  width: 100%;
  margin: 0;
  padding: 12px 16px;
  border: none;
  border-bottom: 1px solid #f0ebe3;
  background: transparent;
  text-align: left;
  color: inherit;
  font: inherit;
}
.picker-item:active {
  background: #f7f1e8;
}
.picker-name {
  font-size: 15px;
  color: var(--ft-ink, #2c2419);
}
.picker-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}
.note-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  margin: 0;
  padding: 4px 12px;
  border: 1px solid #c9b8a0;
  border-radius: 999px;
  background: #fff;
  color: #6b5e4f;
  font-size: 13px;
}
.chip.active {
  border-color: #8b3a2a;
  background: rgba(139, 58, 42, 0.08);
  color: #8b3a2a;
}
</style>
