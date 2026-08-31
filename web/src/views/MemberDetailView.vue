<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'

const route = useRoute()
const router = useRouter()
const detail = ref<Record<string, any> | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    const { data } = await api.member(id)
    detail.value = data
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)

function genderLabel(g: string) {
  return g === 'male' ? '男' : g === 'female' ? '女' : '未知'
}

function goMember(id?: number) {
  if (id) router.push(`/members/${id}`)
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="成员档案" left-arrow @click-left="router.back()" />
    <van-loading v-if="loading" class="center" vertical>加载中</van-loading>
    <van-empty v-else-if="!detail" description="成员不存在" />
    <template v-else>
      <div class="profile card-block">
        <div
          class="avatar"
          :class="detail.member.gender"
          :style="
            detail.member.photo_url
              ? { backgroundImage: `url(${detail.member.photo_url})` }
              : undefined
          "
        />
        <h1 class="page-title">{{ detail.member.name }}</h1>
        <p class="page-sub">
          {{ genderLabel(detail.member.gender) }}
          <template v-if="detail.member.birth_date"> · {{ detail.member.birth_date }}</template>
          <template v-if="detail.member.death_date"> — {{ detail.member.death_date }}</template>
          <template v-if="detail.member.generation"> · 第{{ detail.member.generation }}代</template>
        </p>
      </div>

      <div class="card-block" v-if="detail.member.biography">
        <h3>简介</h3>
        <p>{{ detail.member.biography }}</p>
      </div>
      <div class="card-block" v-if="detail.member.notes">
        <h3>备注</h3>
        <p>{{ detail.member.notes }}</p>
      </div>

      <van-cell-group inset title="亲属">
        <van-cell
          v-if="detail.parent"
          title="父亲"
          :value="detail.parent.name"
          is-link
          @click="goMember(detail.parent.id)"
        />
        <van-cell
          v-if="detail.mother"
          title="母亲（父之配偶）"
          :value="detail.mother.name"
          is-link
          @click="goMember(detail.mother.id)"
        />
        <van-cell
          v-for="s in detail.spouses"
          :key="'s' + s.id"
          title="配偶"
          :value="s.name"
          is-link
          @click="goMember(s.id)"
        />
        <van-cell
          v-for="c in detail.children"
          :key="'c' + c.id"
          title="子女"
          :value="c.name"
          is-link
          @click="goMember(c.id)"
        />
        <van-cell
          v-for="sib in detail.siblings"
          :key="'sib' + sib.id"
          title="兄弟姐妹"
          :value="sib.name"
          is-link
          @click="goMember(sib.id)"
        />
      </van-cell-group>
    </template>
  </div>
</template>

<style scoped>
.center {
  margin: 48px auto;
  display: block;
}
.profile {
  text-align: center;
  margin-top: 12px;
}
.avatar {
  width: 88px;
  height: 88px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: var(--ft-paper-deep) center/cover no-repeat;
  border: 2px solid var(--ft-line);
}
.avatar.male {
  box-shadow: 0 0 0 3px rgba(61, 90, 122, 0.25);
}
.avatar.female {
  box-shadow: 0 0 0 3px rgba(139, 74, 90, 0.25);
}
</style>
