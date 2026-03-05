<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBlogStore } from '../stores/blog'
import { uploadToCloudinary, getBlog, type BlogBlock, type Blog } from '../firebase/blogs'
import { useAuthStore } from '../stores/auth'

const router  = useRouter()
const route   = useRoute()
const store   = useBlogStore()
const authStore = useAuthStore()

// ── State ──────────────────────────────────────────────────────────────────────
const title       = ref('')
const mainImage   = ref('')          // cloudinary URL
const mainImgFile = ref<File|null>(null)
const mainImgPreview = ref('')       // local object URL for preview
const blocks      = ref<BlogBlock[]>([
  { id: crypto.randomUUID(), type: 'text', content: '' }
])
const status      = ref<'draft' | 'public'>('draft')

const saving       = ref(false)
const uploading    = ref(false)
const uploadingIdx = ref<number | null>(null)
const globalError  = ref('')
const saveSuccess  = ref(false)
const isEdit       = ref(false)
const editId       = ref('')

// ── Load existing blog for edit ────────────────────────────────────────────────
onMounted(async () => {
  const id = route.params.id as string | undefined
  if (id) {
    isEdit.value = true
    editId.value = id
    const blog = await getBlog(id)
    if (blog) {
      title.value      = blog.title
      mainImage.value  = blog.mainImage || ''
      mainImgPreview.value = blog.mainImage || ''
      blocks.value     = blog.blocks.length ? blog.blocks : [{ id: crypto.randomUUID(), type: 'text', content: '' }]
      status.value     = blog.status
    }
  }
})

// ── Main image handling ────────────────────────────────────────────────────────
function onMainImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 8 * 1024 * 1024) { globalError.value = 'Main image must be under 8 MB.'; return }
  mainImgFile.value = file
  mainImgPreview.value = URL.createObjectURL(file)
  globalError.value = ''
}

function removeMainImage() {
  mainImage.value = ''
  mainImgPreview.value = ''
  mainImgFile.value = null
}

// ── Block management ───────────────────────────────────────────────────────────
function addTextBlock(afterIdx: number) {
  blocks.value.splice(afterIdx + 1, 0, {
    id: crypto.randomUUID(),
    type: 'text',
    content: ''
  })
}

function addImageBlock(afterIdx: number) {
  blocks.value.splice(afterIdx + 1, 0, {
    id: crypto.randomUUID(),
    type: 'image',
    content: '',
    caption: ''
  })
}

function removeBlock(idx: number) {
  if (blocks.value.length === 1) return
  blocks.value.splice(idx, 1)
}

function moveBlock(idx: number, dir: -1 | 1) {
  const target = idx + dir
  if (target < 0 || target >= blocks.value.length) return
  const tmp = blocks.value[idx]
  blocks.value[idx] = blocks.value[target]
  blocks.value[target] = tmp
}

// ── In-blog image upload ───────────────────────────────────────────────────────
async function onBlockImageChange(e: Event, idx: number) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 8 * 1024 * 1024) { globalError.value = 'Image must be under 8 MB.'; return }
  globalError.value = ''
  uploadingIdx.value = idx
  try {
    const url = await uploadToCloudinary(file)
    blocks.value[idx].content = url
  } catch (err: any) {
    globalError.value = err.message || 'Image upload failed.'
  } finally {
    uploadingIdx.value = null
  }
}

// ── Save ───────────────────────────────────────────────────────────────────────
const canSave = computed(() => title.value.trim().length > 0 && !saving.value)

async function handleSave(targetStatus: 'draft' | 'public') {
  if (!canSave.value) return
  globalError.value = ''
  saving.value      = true
  status.value      = targetStatus

  try {
    // Upload main image if a new file was chosen
    if (mainImgFile.value) {
      uploading.value = true
      mainImage.value = await uploadToCloudinary(mainImgFile.value)
      uploading.value = false
    }

    const blogPayload: Omit<Blog, 'userId' | 'authorName' | 'authorPhoto' | 'createdAt' | 'updatedAt'> = {
      id: editId.value || crypto.randomUUID(),
      title: title.value.trim(),
      // Only include mainImage when a URL exists — Firestore rejects undefined
      ...(mainImage.value ? { mainImage: mainImage.value } : {}),
      blocks: blocks.value.filter(b => b.type === 'image' ? b.content : true),
      status: targetStatus,
      tags: [],
      excerpt: ''
    }

    if (isEdit.value) {
      blogPayload.id = editId.value
    } else {
      editId.value = blogPayload.id
      isEdit.value = true
    }

    await store.upsertBlog(blogPayload)
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (err: any) {
    globalError.value = err.message || 'Failed to save blog.'
  } finally {
    saving.value    = false
    uploading.value = false
  }
}

function goBack() {
  router.push('/blogs/my')
}
</script>

<template>
  <div class="min-h-screen bg-[#070c09] text-white">

    <!-- Top bar -->
    <div class="sticky top-[57px] z-20 bg-[#070c09]/95 backdrop-blur-md border-b border-[#1a2820]">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <!-- Back + title -->
        <div class="flex items-center gap-3 min-w-0">
          <button @click="goBack"
            class="flex-shrink-0 p-2 rounded-lg bg-[#111a14] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#4ade80]/30 transition-all">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div class="min-w-0">
            <h1 class="text-sm font-bold text-[#c8ddd5] truncate">{{ isEdit ? 'Edit Blog' : 'Create Blog' }}</h1>
            <p class="text-[10px] text-[#3d5a4a]">
              <span :class="status === 'public' ? 'text-[#4ade80]' : 'text-[#4a6b58]'">
                {{ status === 'public' ? '● Public' : '○ Draft' }}
              </span>
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Save as draft -->
          <button @click="handleSave('draft')" :disabled="!canSave"
            class="px-3 py-2 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            :class="status === 'draft'
              ? 'bg-[#1a2820] border-[#4ade80]/30 text-[#4ade80]'
              : 'bg-[#111a14] border-[#1a2820] text-[#4a6b58] hover:text-[#8fb89f] hover:border-[#2a4035]'">
            <span v-if="saving && status === 'draft'" class="flex items-center gap-1.5">
              <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              Saving…
            </span>
            <span v-else>Save Draft</span>
          </button>

          <!-- Publish -->
          <button @click="handleSave('public')" :disabled="!canSave"
            class="px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            :class="status === 'public'
              ? 'bg-[#4ade80] text-[#070c09] shadow-lg shadow-[#4ade80]/20'
              : 'bg-[#1a2820] border border-[#2a4035] text-[#8fb89f] hover:bg-[#4ade80] hover:text-[#070c09]'">
            <svg v-if="saving && status === 'public'" class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            <svg v-else class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>
            {{ status === 'public' ? 'Update' : 'Publish' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Editor content -->
    <div class="max-w-4xl mx-auto px-4 py-8 space-y-8">

      <!-- Notices -->
      <div v-if="globalError" class="flex items-start gap-3 p-4 bg-red-950/40 border border-red-800/40 rounded-xl text-sm text-red-400">
        <svg class="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ globalError }}
      </div>
      <div v-if="saveSuccess" class="flex items-center gap-3 p-4 bg-[#0a1f10] border border-[#4ade80]/25 rounded-xl text-sm text-[#4ade80]">
        <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Blog saved successfully!
      </div>

      <!-- Title -->
      <div class="space-y-2">
        <label class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Blog Title *</label>
        <input
          v-model="title"
          type="text"
          placeholder="Write an amazing title…"
          maxlength="200"
          class="w-full bg-transparent border-0 border-b-2 border-[#1a2820] text-3xl font-bold text-[#e8f5ed] placeholder-[#1f3228] outline-none focus:border-[#4ade80]/50 transition-colors py-2 leading-tight"
        />
        <p class="text-[10px] text-[#2d4035] text-right">{{ title.length }}/200</p>
      </div>

      <!-- Main Image -->
      <div class="space-y-3">
        <label class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Cover Image (Optional)</label>

        <div v-if="mainImgPreview"
          class="relative rounded-2xl overflow-hidden border border-[#1a2820] group">
          <img :src="mainImgPreview" alt="Cover" class="w-full max-h-72 object-cover" />
          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
            <label for="main-img-change"
              class="px-4 py-2 rounded-lg bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold cursor-pointer hover:bg-white/20 transition-all">
              Change
            </label>
            <button @click="removeMainImage"
              class="px-4 py-2 rounded-lg bg-red-500/20 backdrop-blur border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition-all">
              Remove
            </button>
          </div>
          <input id="main-img-change" type="file" accept="image/*" class="hidden" @change="onMainImageChange" />
        </div>

        <label v-else for="main-img-upload"
          class="flex flex-col items-center justify-center gap-3 w-full h-48 border-2 border-dashed border-[#1a2820] rounded-2xl cursor-pointer hover:border-[#4ade80]/40 hover:bg-[#4ade80]/5 transition-all group">
          <div class="w-12 h-12 rounded-full bg-[#111a14] border border-[#1a2820] flex items-center justify-center group-hover:border-[#4ade80]/30 transition-all">
            <svg class="w-5 h-5 text-[#4a6b58] group-hover:text-[#4ade80] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <div class="text-center">
            <p class="text-sm font-semibold text-[#4a6b58] group-hover:text-[#8fb89f] transition-colors">Add cover image</p>
            <p class="text-xs text-[#2d4035] mt-0.5">PNG, JPG, WebP up to 8 MB</p>
          </div>
          <input id="main-img-upload" type="file" accept="image/*" class="hidden" @change="onMainImageChange" />
        </label>
      </div>

      <!-- Content Blocks -->
      <div class="space-y-4">
        <label class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Content</label>

        <div
          v-for="(block, idx) in blocks"
          :key="block.id"
          class="group relative"
        >
          <!-- Block container -->
          <div class="rounded-xl border border-[#1a2820] hover:border-[#2a4035] transition-all overflow-hidden bg-[#0a0f0b]">

            <!-- Block header controls -->
            <div class="flex items-center justify-between px-3 py-2 border-b border-[#111a14] bg-[#0a0f0b]">
              <span class="text-[9px] font-bold text-[#2d4035] uppercase tracking-widest">
                {{ block.type === 'text' ? '✍ Text Block' : '🖼 Image Block' }}
              </span>
              <div class="flex items-center gap-1">
                <!-- Move up -->
                <button v-if="idx > 0" @click="moveBlock(idx, -1)" title="Move up"
                  class="p-1 rounded text-[#2d4035] hover:text-[#4ade80] hover:bg-[#111a14] transition-all">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <!-- Move down -->
                <button v-if="idx < blocks.length - 1" @click="moveBlock(idx, 1)" title="Move down"
                  class="p-1 rounded text-[#2d4035] hover:text-[#4ade80] hover:bg-[#111a14] transition-all">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <!-- Remove -->
                <button v-if="blocks.length > 1" @click="removeBlock(idx)" title="Remove block"
                  class="p-1 rounded text-[#2d4035] hover:text-red-400 hover:bg-red-950/30 transition-all">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <!-- Text block -->
            <textarea v-if="block.type === 'text'"
              v-model="block.content"
              placeholder="Write your content here…"
              rows="5"
              class="w-full bg-transparent p-4 text-sm text-[#c8ddd5] placeholder-[#1f3228] outline-none resize-y leading-relaxed"
            />

            <!-- Image block -->
            <div v-else class="p-4 space-y-3">

              <!-- Upload spinner -->
              <div v-if="uploadingIdx === idx"
                class="flex items-center justify-center h-40 gap-3">
                <svg class="w-5 h-5 animate-spin text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                <span class="text-sm text-[#4a6b58]">Uploading to Cloudinary…</span>
              </div>

              <!-- Image preview -->
              <div v-else-if="block.content" class="relative group/img">
                <img :src="block.content" alt="Block image" class="w-full max-h-64 object-cover rounded-lg border border-[#1a2820]" />
                <label :for="`block-img-${idx}`"
                  class="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-all rounded-lg flex items-center justify-center cursor-pointer gap-2">
                  <span class="px-4 py-2 rounded-lg bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold">Change Image</span>
                </label>
                <input :id="`block-img-${idx}`" type="file" accept="image/*" class="hidden" @change="(e) => onBlockImageChange(e, idx)" />
              </div>

              <!-- Upload area -->
              <label v-else :for="`block-img-${idx}`"
                class="flex flex-col items-center justify-center gap-2 h-40 border-2 border-dashed border-[#1a2820] rounded-xl cursor-pointer hover:border-[#4ade80]/40 hover:bg-[#4ade80]/5 transition-all">
                <svg class="w-6 h-6 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p class="text-xs text-[#3d5a4a]">Click to upload image</p>
                <input :id="`block-img-${idx}`" type="file" accept="image/*" class="hidden" @change="(e) => onBlockImageChange(e, idx)" />
              </label>

              <!-- Caption -->
              <input
                v-model="block.caption"
                type="text"
                placeholder="Image caption (optional)"
                class="w-full bg-[#070c09] border border-[#111a14] text-[#4a6b58] placeholder-[#1a2820] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#2a4035] transition-all"
              />
            </div>
          </div>

          <!-- Add block buttons below each block -->
          <div class="flex items-center justify-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span class="text-[9px] text-[#2d4035] uppercase tracking-widest">Add after</span>
            <button @click="addTextBlock(idx)"
              class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111a14] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#4ade80]/30 text-[10px] font-semibold transition-all">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Text
            </button>
            <button @click="addImageBlock(idx)"
              class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111a14] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#4ade80]/30 text-[10px] font-semibold transition-all">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Image
            </button>
          </div>
        </div>

        <!-- Add first block buttons when empty visually -->
        <div class="flex justify-center gap-3 mt-2">
          <button @click="addTextBlock(blocks.length - 1)"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111a14] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#4ade80]/30 text-xs font-semibold transition-all">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Text Block
          </button>
          <button @click="addImageBlock(blocks.length - 1)"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111a14] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#4ade80]/30 text-xs font-semibold transition-all">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Add Image Block
          </button>
        </div>
      </div>

      <!-- Bottom padding -->
      <div class="h-20" />
    </div>
  </div>
</template>
