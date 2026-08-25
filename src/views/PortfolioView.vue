<script setup lang="ts">
import { ref } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { toastOk } from '@/composables/useToast'

interface Work {
  id: number
  title: string
  cat: string
  cover: string
  published: boolean
  likes: number
}

const works = ref<Work[]>([
  { id: 1, title: '家庭纪念写真合集', cat: '家庭写真', cover: 'linear-gradient(160deg,#cfe7dd,#7fb8a4)', published: true, likes: 86 },
  { id: 2, title: '商务形象 · 蓝桥科技', cat: '商务肖像', cover: 'linear-gradient(160deg,#e5def2,#a894c9)', published: true, likes: 42 },
  { id: 3, title: '林柚 · 自然人像', cat: '自然人像', cover: 'linear-gradient(160deg,#fdeadd,#e2a97f)', published: true, likes: 133 },
  { id: 4, title: '张明婚礼纪实', cat: '婚礼跟拍', cover: 'linear-gradient(160deg,#f4e7a9,#d9b64f)', published: false, likes: 0 },
  { id: 5, title: '亲子时光 · 李芳', cat: '家庭写真', cover: 'linear-gradient(160deg,#f9dcd8,#e08a80)', published: true, likes: 61 },
  { id: 6, title: '证件照标准套系', cat: '证件照', cover: 'linear-gradient(160deg,#edeeea,#b8bdb8)', published: true, likes: 20 }
])

const filter = ref('全部')
const cats = ['全部', ...new Set(works.value.map((w) => w.cat))]

const filtered = works.value.filter((w) => filter.value === '全部' || w.cat === filter.value)
</script>

<template>
  <div>
    <AppToast />
    <div class="page-head">
      <div>
        <h1>作品集</h1>
        <p>对外展示与客户 H5 预览的内容管理。</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" @click="toastOk('上传作品（演示）')">+ 上传作品</button>
      </div>
    </div>

    <div class="data-source-tip">
      <svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>
      演示数据（后端未连接）— 作品集模块支持 API 接口。
    </div>

    <div class="seg" style="margin-bottom: 18px">
      <button
        v-for="c in cats"
        :key="c"
        :class="{ active: filter === c }"
        @click="filter = c"
      >
        {{ c }}
      </button>
    </div>

    <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px">
      <div v-for="w in filtered" :key="w.id" class="work-card">
        <div class="cover" :style="{ background: w.cover }">
          <span class="cover-tag">{{ w.cat }}</span>
          <span v-if="!w.published" class="cover-tag dark">未发布</span>
        </div>
        <div class="card-pad work-body">
          <div class="flex between">
            <b class="serif">{{ w.title }}</b>
            <span class="muted xsmall">♥ {{ w.likes }}</span>
          </div>
          <div class="flex between mt-12">
            <span class="pill" :class="w.published ? 'status-ok' : 'status-disabled'">
              {{ w.published ? '已发布' : '草稿' }}
            </span>
            <div class="flex gap-6">
              <button class="btn btn-sm btn-outline" @click="toastOk('生成 H5 预览（演示）')">H5 预览</button>
              <button class="btn btn-sm btn-outline" @click="toastOk('编辑（演示）')">编辑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.work-card {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.cover {
  height: 150px;
  position: relative;
  display: flex;
  gap: 7px;
  padding: 10px;
  align-items: flex-start;
  justify-content: flex-end;
}

.cover-tag {
  background: rgba(255, 254, 250, 0.92);
  color: var(--ink-2);
  font-size: 10px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.cover-tag.dark {
  background: rgba(23, 37, 43, 0.85);
  color: #fff;
}
</style>