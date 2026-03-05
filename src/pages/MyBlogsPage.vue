<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '../stores/blog'
import { useAuthStore } from '../stores/auth'

const router    = useRouter()
const store     = useBlogStore()
const authStore = useAuthStore()

const search  = ref('')
const deleting = ref<string | null>(null)
const deleteConfirm = ref<string | null>(null)

onMounted(() => {
  if (!store.userBlogs.length) {
    store.loadUserBlogs()
  }
})

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.userBlogs
  return store.userBlogs.filter(b =>
    b.title.toLowerCase().includes(q) ||
    (b.excerpt || '').toLowerCase().includes(q)
  )
})

function formatDate(ts: any) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function confirmDelete(id: string) {
  if (deleteConfirm.value !== id) {
    deleteConfirm.value = id
    setTimeout(() => { if (deleteConfirm.value === id) deleteConfirm.value = null }, 3000)
    return
  }
  deleting.value  = id
  deleteConfirm.value = null
  try {
    await store.deleteBlog(id)
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#070c09] text-white">

    <!-- Page header -->
    <div class="sticky top-[57px] z-20 bg-[#070c09]/95 backdrop-blur-md border-b border-[#1a2820]">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 class="text-sm font-bold text-[#c8ddd5]">My Blogs</h1>
          <p class="text-[10px] text-[#3d5a4a]">{{ store.userBlogs.length }} {{ store.userBlogs.length === 1 ? 'post' : 'posts' }}</p>
        </div>
        <button @click="router.push('/blogs/create')"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4ade80] text-[#070c09] text-xs font-bold hover:bg-[#22c55e] shadow-lg shadow-[#4ade80]/20 transition-all active:scale-95">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Blog
        </button>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 py-8 space-y-6">

      <!-- Search -->
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" type="text" placeholder="Search your blogs…"
          class="w-full bg-[#0a0f0b] border border-[#1a2820] text-[#c8ddd5] placeholder-[#2d4035] text-sm rounded-xl pl-9 pr-4 py-3 outline-none focus:border-[#4ade80]/40 focus:ring-2 focus:ring-[#4ade80]/10 transition-all" />
      </div>

      <!-- Loading -->
      <div v-if="store.loading" class="flex items-center justify-center h-40 gap-3">
        <svg class="w-5 h-5 animate-spin text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        <span class="text-sm text-[#4a6b58]">Loading blogs…</span>
      </div>

      <!-- Empty state -->
      <div v-else-if="store.userBlogs.length === 0"
        class="flex flex-col items-center justify-center h-60 gap-4 border border-dashed border-[#1a2820] rounded-2xl">
        <div class="w-16 h-16 rounded-full bg-[#111a14] border border-[#1a2820] flex items-center justify-center">
          <svg class="w-7 h-7 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div class="text-center">
          <p class="text-sm font-semibold text-[#4a6b58]">No blogs yet</p>
          <p class="text-xs text-[#2d4035] mt-1">Start writing your first blog post</p>
        </div>
        <button @click="router.push('/blogs/create')"
          class="px-5 py-2.5 rounded-xl bg-[#4ade80] text-[#070c09] text-sm font-bold hover:bg-[#22c55e] transition-all active:scale-95">
          Write First Blog
        </button>
      </div>

      <!-- No results -->
      <div v-else-if="filtered.length === 0"
        class="flex flex-col items-center justify-center h-40 gap-3 text-[#3d5a4a]">
        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p class="text-sm">No blogs match "<span class="text-[#4a6b58]">{{ search }}</span>"</p>
      </div>

      <!-- Blog cards -->
      <div v-else class="grid gap-4">
        <div
          v-for="blog in filtered"
          :key="blog.id"
          class="group flex gap-4 p-4 bg-[#0a0f0b] border border-[#1a2820] rounded-2xl hover:border-[#2a4035] transition-all"
        >
          <!-- Cover thumbnail -->
          <div class="flex-shrink-0">
            <div v-if="blog.mainImage"
              class="w-20 h-20 rounded-xl overflow-hidden border border-[#1a2820]">
              <img :src="blog.mainImage" alt="Cover" class="w-full h-full object-cover" />
            </div>
            <div v-else
              class="w-20 h-20 rounded-xl bg-[#111a14] border border-[#1a2820] flex items-center justify-center">
              <svg class="w-7 h-7 text-[#1f3228]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-sm font-bold text-[#c8ddd5] leading-snug truncate">{{ blog.title }}</h3>
              <!-- Status badge -->
              <span :class="blog.status === 'public'
                ? 'bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/25'
                : 'bg-[#1a2820] text-[#4a6b58] border-[#2a4035]'"
                class="flex-shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border">
                {{ blog.status }}
              </span>
            </div>
            <p class="text-xs text-[#3d5a4a] mt-1 leading-relaxed line-clamp-2">{{ blog.excerpt || 'No content yet.' }}</p>
            <div class="flex items-center gap-3 mt-2">
              <span class="text-[10px] text-[#2d4035]">{{ formatDate(blog.createdAt) }}</span>
              <span class="text-[10px] text-[#1a2820]">·</span>
              <span class="text-[10px] text-[#2d4035]">{{ blog.blocks?.length || 0 }} blocks</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="router.push(`/blogs/edit/${blog.id}`)"
              class="p-2 rounded-lg bg-[#111a14] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#4ade80]/30 transition-all"
              title="Edit">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button
              @click="confirmDelete(blog.id)"
              :disabled="deleting === blog.id"
              :class="deleteConfirm === blog.id
                ? 'bg-red-950/60 border-red-700/50 text-red-400'
                : 'bg-[#111a14] border-[#1a2820] text-[#4a6b58] hover:text-red-400 hover:border-red-800/40'"
              class="p-2 rounded-lg border transition-all disabled:opacity-40"
              :title="deleteConfirm === blog.id ? 'Click again to confirm delete' : 'Delete'"
            >
              <svg v-if="deleting === blog.id" class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
