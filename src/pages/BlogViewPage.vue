<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBlog, type Blog } from '../firebase/blogs'

const route  = useRoute()
const router = useRouter()

const blog    = ref<Blog | null>(null)
const loading = ref(true)
const error   = ref('')

onMounted(async () => {
  try {
    const id = route.params.id as string
    blog.value = await getBlog(id)
    if (!blog.value) error.value = 'Blog not found.'
  } catch (e: any) {
    error.value = e.message || 'Failed to load blog.'
  } finally {
    loading.value = false
  }
})

function formatDate(ts: any) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="min-h-screen bg-[#070c09] text-white">

    <!-- Back button -->
    <div class="sticky top-[57px] z-20 bg-[#070c09]/95 backdrop-blur-md border-b border-[#1a2820]">
      <div class="max-w-3xl mx-auto px-4 py-3">
        <button @click="router.push('/blogs')"
          class="flex items-center gap-2 text-xs font-semibold text-[#4a6b58] hover:text-[#4ade80] transition-colors">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Blogs
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="max-w-3xl mx-auto px-4 py-12 space-y-6 animate-pulse">
      <div class="h-8 bg-[#111a14] rounded w-3/4" />
      <div class="h-4 bg-[#111a14] rounded w-1/3" />
      <div class="h-64 bg-[#111a14] rounded-2xl" />
      <div class="space-y-3">
        <div class="h-3 bg-[#111a14] rounded" />
        <div class="h-3 bg-[#111a14] rounded w-5/6" />
        <div class="h-3 bg-[#111a14] rounded w-4/5" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-4">
      <svg class="w-12 h-12 text-[#1f3228]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p class="text-sm text-[#4a6b58]">{{ error }}</p>
      <button @click="router.push('/blogs')"
        class="px-5 py-2.5 rounded-xl bg-[#4ade80] text-[#070c09] text-sm font-bold hover:bg-[#22c55e] transition-all">
        Go back
      </button>
    </div>

    <!-- Blog content -->
    <article v-else-if="blog" class="max-w-3xl mx-auto px-4 py-12">

      <!-- Title -->
      <h1 class="text-3xl sm:text-4xl font-black text-white leading-tight mb-6">
        {{ blog.title }}
      </h1>

      <!-- Author + meta row -->
      <div class="flex items-center gap-3 mb-8 pb-6 border-b border-[#1a2820]">
        <img v-if="blog.authorPhoto" :src="blog.authorPhoto" alt="Author"
          class="w-9 h-9 rounded-full object-cover ring-2 ring-[#2a4035]" />
        <div v-else
          class="w-9 h-9 rounded-full bg-[#132218] border border-[#2a4035] flex items-center justify-center text-xs font-bold text-[#4ade80]">
          {{ getInitials(blog.authorName) }}
        </div>
        <div>
          <p class="text-sm font-semibold text-[#c8ddd5]">{{ blog.authorName }}</p>
          <p class="text-xs text-[#3d5a4a]">{{ formatDate(blog.createdAt) }}</p>
        </div>
      </div>

      <!-- Main cover image -->
      <div v-if="blog.mainImage" class="mb-10 rounded-2xl overflow-hidden border border-[#1a2820]">
        <img :src="blog.mainImage" :alt="blog.title" class="w-full max-h-96 object-cover" />
      </div>

      <!-- Content blocks -->
      <div class="space-y-8">
        <div v-for="block in blog.blocks" :key="block.id">

          <!-- Text block -->
          <div v-if="block.type === 'text' && block.content"
            class="prose prose-invert max-w-none text-[#9ab5a6] leading-relaxed whitespace-pre-wrap text-[15px]">
            {{ block.content }}
          </div>

          <!-- Image block -->
          <figure v-else-if="block.type === 'image' && block.content" class="space-y-2">
            <div class="rounded-xl overflow-hidden border border-[#1a2820]">
              <img :src="block.content" alt="Blog image" class="w-full max-h-[500px] object-cover" />
            </div>
            <figcaption v-if="block.caption"
              class="text-center text-xs text-[#3d5a4a] italic mt-2">
              {{ block.caption }}
            </figcaption>
          </figure>

        </div>
      </div>

      <!-- Footer -->
      <div class="mt-16 pt-8 border-t border-[#1a2820] flex items-center justify-between">
        <button @click="router.push('/blogs')"
          class="flex items-center gap-2 text-xs font-semibold text-[#4a6b58] hover:text-[#4ade80] transition-colors">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          All Blogs
        </button>
        <span class="text-[10px] text-[#1f3228]">KeepITs · {{ formatDate(blog.updatedAt || blog.createdAt) }}</span>
      </div>
    </article>

  </div>
</template>
