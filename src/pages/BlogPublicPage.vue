<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { getPublicBlogs, searchPublicBlogs, type Blog } from '../firebase/blogs'
import { useRouter } from 'vue-router'

const router = useRouter()

// ── State ──────────────────────────────────────────────────────────────────────
const blogs       = ref<Blog[]>([])
const loading     = ref(false)
const searchQuery = ref('')
const isSearching = ref(false)
const noMore      = ref(false)

const PAGE_SIZE = 9
let lastDoc: any = null

// ── Load blogs ─────────────────────────────────────────────────────────────────
async function loadBlogs(reset = false) {
  if (loading.value) return
  loading.value = true

  try {
    if (reset) {
      blogs.value = []
      lastDoc = null
      noMore.value = false
    }
    const { blogs: fetched, lastDoc: ld } = await getPublicBlogs(PAGE_SIZE, lastDoc)
    blogs.value.push(...fetched)
    lastDoc = ld
    if (fetched.length < PAGE_SIZE) noMore.value = true
  } finally {
    loading.value = false
  }
}

// ── Search ─────────────────────────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!val.trim()) {
    isSearching.value = false
    loadBlogs(true)
    return
  }
  isSearching.value = true
  loading.value     = true
  searchTimer = setTimeout(async () => {
    try {
      blogs.value = await searchPublicBlogs(val.trim())
      noMore.value = true
    } finally {
      loading.value = false
    }
  }, 400)
})

onMounted(() => loadBlogs(true))

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(ts: any) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getAvatar(blog: Blog) {
  return blog.authorPhoto || null
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="min-h-screen bg-[#070c09] text-white">

    <!-- Hero header -->
    <div class="relative overflow-hidden border-b border-[#1a2820]">
      <!-- Gradient blobs -->
      <div class="absolute -top-20 -right-20 w-64 h-64 bg-[#4ade80]/5 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute -bottom-10 -left-10 w-48 h-48 bg-[#22c55e]/4 rounded-full blur-3xl pointer-events-none" />

      <div class="relative max-w-5xl mx-auto px-4 py-14 text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/20 text-[#4ade80] text-[10px] font-bold uppercase tracking-widest mb-5">
          <span class="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
          Community Blogs
        </div>
        <h1 class="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
          Stories from the<br/>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-[#22c55e]">KeepITs</span> community
        </h1>
        <p class="text-sm text-[#4a6b58] max-w-md mx-auto leading-relaxed">
          Explore task insights, productivity tips, and workflows shared by our community.
        </p>

        <!-- Search -->
        <div class="relative max-w-lg mx-auto mt-8">
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search blogs by title or content…"
            id="public-blog-search"
            class="w-full bg-[#0a0f0b] border border-[#1a2820] text-[#c8ddd5] placeholder-[#2d4035] text-sm rounded-2xl pl-10 pr-4 py-3.5 outline-none focus:border-[#4ade80]/40 focus:ring-2 focus:ring-[#4ade80]/10 transition-all shadow-xl shadow-black/40"
          />
          <div v-if="loading && isSearching"
            class="absolute right-4 top-1/2 -translate-y-1/2">
            <svg class="w-4 h-4 animate-spin text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Blog grid -->
    <div class="max-w-5xl mx-auto px-4 py-10">

      <!-- Initial loading -->
      <div v-if="loading && blogs.length === 0"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i"
          class="bg-[#0a0f0b] border border-[#1a2820] rounded-2xl overflow-hidden animate-pulse">
          <div class="h-44 bg-[#111a14]" />
          <div class="p-4 space-y-3">
            <div class="h-3 bg-[#111a14] rounded w-3/4" />
            <div class="h-2 bg-[#111a14] rounded w-full" />
            <div class="h-2 bg-[#111a14] rounded w-2/3" />
          </div>
        </div>
      </div>

      <!-- Empty search -->
      <div v-else-if="!loading && blogs.length === 0 && isSearching"
        class="flex flex-col items-center justify-center h-60 gap-4">
        <svg class="w-10 h-10 text-[#1f3228]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p class="text-sm text-[#3d5a4a]">No blogs found for "<span class="text-[#4a6b58]">{{ searchQuery }}</span>"</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="!loading && blogs.length === 0"
        class="flex flex-col items-center justify-center h-60 gap-4">
        <svg class="w-10 h-10 text-[#1f3228]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p class="text-sm text-[#3d5a4a]">No public blogs yet.</p>
      </div>

      <!-- Cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="blog in blogs"
          :key="blog.id"
          class="group flex flex-col bg-[#0a0f0b] border border-[#1a2820] rounded-2xl overflow-hidden hover:border-[#2a4035] hover:shadow-xl hover:shadow-black/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          @click="router.push(`/blogs/${blog.id}`)"
        >
          <!-- Cover image -->
          <div class="relative overflow-hidden h-44 bg-[#111a14] flex-shrink-0">
            <img v-if="blog.mainImage"
              :src="blog.mainImage"
              :alt="blog.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-12 h-12 text-[#1f3228]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <!-- Gradient overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-[#0a0f0b]/80 via-transparent to-transparent" />
          </div>

          <!-- Content -->
          <div class="flex flex-col flex-1 p-4 gap-3">
            <h2 class="text-sm font-bold text-[#c8ddd5] leading-snug line-clamp-2 group-hover:text-white transition-colors">
              {{ blog.title }}
            </h2>
            <p class="text-xs text-[#3d5a4a] leading-relaxed line-clamp-3 flex-1">
              {{ blog.excerpt || 'No preview available.' }}
            </p>

            <!-- Author + date row -->
            <div class="flex items-center justify-between pt-2 border-t border-[#111a14]">
              <div class="flex items-center gap-2">
                <img v-if="getAvatar(blog)" :src="getAvatar(blog)!" alt="Author"
                  class="w-6 h-6 rounded-full object-cover ring-1 ring-[#2a4035]" />
                <div v-else
                  class="w-6 h-6 rounded-full bg-[#132218] border border-[#2a4035] flex items-center justify-center text-[8px] font-bold text-[#4ade80]">
                  {{ getInitials(blog.authorName) }}
                </div>
                <span class="text-[10px] text-[#4a6b58] font-medium truncate max-w-[100px]">{{ blog.authorName }}</span>
              </div>
              <span class="text-[9px] text-[#2d4035]">{{ formatDate(blog.createdAt) }}</span>
            </div>
          </div>
        </article>
      </div>

      <!-- Load more -->
      <div v-if="!isSearching && !noMore && blogs.length > 0" class="flex justify-center mt-10">
        <button @click="loadBlogs()" :disabled="loading"
          class="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#111a14] border border-[#1a2820] text-[#4a6b58] text-sm font-semibold hover:border-[#2a4035] hover:text-[#8fb89f] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <svg v-if="loading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          {{ loading ? 'Loading…' : 'Load more' }}
        </button>
      </div>

      <!-- End notice -->
      <div v-if="noMore && blogs.length > 0 && !isSearching"
        class="text-center mt-10 text-[10px] text-[#1f3228] uppercase tracking-widest">
        · All caught up ·
      </div>
    </div>
  </div>
</template>
