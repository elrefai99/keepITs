<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { updateProfile as firebaseUpdateProfile } from 'firebase/auth'
import { db, auth } from '../firebase/config'

const authStore = useAuthStore()

// ── Profile popup state ─────────────────────────────────────────────────────
const showProfile   = ref(false)
const editName      = ref('')
const previewImage  = ref<string | null>(null)   // base64 or URL
const saving        = ref(false)
const saveSuccess   = ref(false)
const saveError     = ref('')
const fileInputRef  = ref<HTMLInputElement | null>(null)

// Computed avatar: prefer local preview → stored photoURL → initials fallback
const avatarSrc = computed(() =>
  previewImage.value
    || authStore.user?.photoURL
    || null
)

const userInitials = computed(() => {
  const name = authStore.user?.displayName || authStore.user?.email || '?'
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
})

function openProfile() {
  editName.value    = authStore.user?.displayName || ''
  previewImage.value = authStore.user?.photoURL || null
  saveSuccess.value  = false
  saveError.value    = ''
  showProfile.value  = true
}

function closeProfile() {
  showProfile.value  = false
  previewImage.value = authStore.user?.photoURL || null
}

// Handle image file pick → convert to base64
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    saveError.value = 'Image must be under 2 MB.'
    return
  }
  saveError.value = ''
  const reader = new FileReader()
  reader.onload = () => { previewImage.value = reader.result as string }
  reader.readAsDataURL(file)
}

// Save changes to Firebase Auth + Firestore
async function saveProfile() {
  if (!authStore.user) return
  if (!editName.value.trim()) { saveError.value = 'Name cannot be empty.'; return }

  saving.value    = true
  saveError.value = ''

  try {
    const photoURL = previewImage.value || authStore.user.photoURL || ''

    // 1. Update Firebase Auth profile
    if (auth.currentUser) {
      await firebaseUpdateProfile(auth.currentUser, {
        displayName: editName.value.trim(),
        photoURL
      })
    }

    // 2. Persist to Firestore user doc
    await setDoc(
      doc(db, 'users', authStore.user.uid),
      { displayName: editName.value.trim(), photoURL, updatedAt: serverTimestamp() },
      { merge: true }
    )

    // 3. Refresh auth store so UI updates
    if (authStore.userData) {
      authStore.userData.displayName = editName.value.trim()
      authStore.userData.photoURL    = photoURL
    }
    // Force reactive refresh on the Firebase user object
    if (authStore.user) {
      (authStore.user as any).displayName = editName.value.trim()
      ;(authStore.user as any).photoURL   = photoURL
    }

    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2500)
  } catch (err: any) {
    saveError.value = err?.message || 'Failed to save. Try again.'
  } finally {
    saving.value = false
  }
}

// Logout
async function handleLogout() {
  try { await authStore.signOut() } catch (e) { console.error(e) }
}
</script>

<template>
  <header>
    <nav class="w-full bg-[#0a0f0b]/90 backdrop-blur-md border-b border-[#1a2820] text-white sticky top-0 z-30">
      <div class="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5">

        <!-- Logo -->
        <div class="flex items-center gap-2 select-none">
          <span class="text-xl font-black text-white tracking-tighter leading-none" style="font-family:'Georgia',serif">
            Keep<span class="text-[#4ade80]">ITs</span>
          </span>
        </div>

        <!-- Right -->
        <div class="flex items-center gap-3 sm:gap-4">
          <darkmode />

          <div v-if="authStore.isAuthenticated && authStore.user" class="flex items-center gap-2 sm:gap-3">

            <!-- Clickable avatar -->
            <button @click="openProfile" class="relative group focus:outline-none" title="Profile settings">
              <!-- Avatar image -->
              <img v-if="avatarSrc"
                :src="avatarSrc"
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-1 ring-[#2a4035] object-cover group-hover:ring-[#4ade80]/50 transition-all"
                :alt="authStore.user.displayName || 'User'"
              />
              <!-- Initials fallback -->
              <div v-else
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#132218] border border-[#2a4035] flex items-center justify-center text-[10px] font-bold text-[#4ade80] group-hover:border-[#4ade80]/50 transition-all">
                {{ userInitials }}
              </div>
              <!-- Online dot -->
              <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#4ade80] rounded-full border border-[#0a0f0b]" />
              <!-- Edit hint on hover -->
              <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#0a0f0b] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <svg class="w-1.5 h-1.5 text-[#4ade80]" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 6L18 10.5 8.25 20.25H3.75V15.75z"/></svg>
              </div>
            </button>

            <!-- Name/email (md+) — also clickable -->
            <button @click="openProfile" class="hidden md:block text-left hover:opacity-80 transition-opacity focus:outline-none">
              <p class="text-xs font-semibold text-[#d4e8dc] leading-tight">{{ authStore.user.displayName }}</p>
              <p class="text-[10px] text-[#4a6b58] leading-tight">{{ authStore.user.email }}</p>
            </button>

            <!-- Sign out -->
            <button @click="handleLogout"
              class="px-3 py-1.5 rounded-lg bg-[#1a2820] border border-[#2a3d30] text-[#8fb89f] text-xs font-medium hover:bg-[#1f3228] hover:text-[#4ade80] hover:border-[#4ade80]/30 active:scale-95 transition-all duration-150">
              <span class="hidden sm:inline">Sign out</span>
              <span class="sm:hidden">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              </span>
            </button>
          </div>
        </div>

      </div>
    </nav>
  </header>

  <!-- ══════════════════════════════════════════════════════════════
       PROFILE SETTINGS POPUP
  ══════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <div
      v-if="showProfile"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="closeProfile"
    >
      <div class="bg-[#0d1a11]/85 backdrop-blur-xl border border-[#1f3228] rounded-2xl shadow-2xl shadow-black/80 w-full max-w-sm overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1f3228]">
          <div>
            <h2 class="text-sm font-bold text-[#c8ddd5]">Profile Settings</h2>
            <p class="text-[10px] text-[#3d5a4a] mt-0.5">Update your name & photo</p>
          </div>
          <button @click="closeProfile"
            class="w-8 h-8 flex items-center justify-center rounded-xl bg-[#132218] border border-[#1f3228] text-[#4a6b58] hover:text-white hover:border-[#2a4035] active:scale-95 transition-all">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="px-5 py-5 flex flex-col gap-5">

          <!-- Avatar section -->
          <div class="flex flex-col items-center gap-3">
            <div class="relative group cursor-pointer" @click="fileInputRef?.click()">
              <!-- Avatar preview -->
              <div class="w-20 h-20 rounded-full overflow-hidden ring-2 ring-[#2a4035] group-hover:ring-[#4ade80]/50 transition-all">
                <img v-if="previewImage" :src="previewImage" class="w-full h-full object-cover" alt="Avatar preview" />
                <div v-else class="w-full h-full bg-[#132218] flex items-center justify-center text-xl font-bold text-[#4ade80]">
                  {{ userInitials }}
                </div>
              </div>

              <!-- Hover overlay -->
              <div class="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>

              <!-- Camera badge -->
              <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#4ade80] flex items-center justify-center shadow-lg border-2 border-[#0d1a11]">
                <svg class="w-3 h-3 text-[#070c09]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>

            <!-- Hidden file input -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileChange"
            />

            <div class="text-center">
              <button @click="fileInputRef?.click()"
                class="text-[10px] text-[#4a6b58] hover:text-[#4ade80] transition-colors font-medium">
                Click photo to change · max 2 MB
              </button>
              <p v-if="previewImage && previewImage !== authStore.user?.photoURL"
                class="text-[9px] text-[#4ade80] mt-0.5">New photo selected ✓</p>
            </div>
          </div>

          <!-- Name field -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Display Name</label>
            <input
              v-model="editName"
              type="text"
              placeholder="Your name"
              maxlength="40"
              @keydown.enter="saveProfile"
              class="w-full p-3 bg-[#0a0f0b] border border-[#1f3228] text-[#c8ddd5] rounded-xl text-sm outline-none focus:border-[#4ade80]/50 focus:ring-2 focus:ring-[#4ade80]/10 placeholder-[#2d4035] transition-all font-medium"
            />
          </div>

          <!-- Email (read-only info) -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Email</label>
            <div class="w-full p-3 bg-[#0a0f0b]/60 border border-[#131e17] text-[#3d5a4a] rounded-xl text-sm font-mono flex items-center gap-2">
              <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <span class="truncate text-[#4a6b58]">{{ authStore.user?.email }}</span>
              <span class="ml-auto text-[9px] bg-[#132218] border border-[#1f3228] text-[#3d5a4a] px-1.5 py-0.5 rounded font-semibold flex-shrink-0">Google</span>
            </div>
          </div>

          <!-- Feedback messages -->
          <div v-if="saveError" class="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/40 rounded-xl text-xs text-red-400">
            <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ saveError }}
          </div>
          <div v-if="saveSuccess" class="flex items-center gap-2 p-3 bg-[#0a1f10] border border-[#4ade80]/25 rounded-xl text-xs text-[#4ade80]">
            <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Profile saved successfully!
          </div>

          <!-- Action buttons -->
          <div class="flex gap-2.5">
            <button
              @click="saveProfile"
              :disabled="saving"
              class="flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              :class="saving ? 'bg-[#4ade80]/50 text-[#070c09]/60 cursor-not-allowed' : 'bg-[#4ade80] text-[#070c09] hover:bg-[#22c55e] shadow-lg shadow-[#4ade80]/20'"
            >
              <!-- Spinner while saving -->
              <svg v-if="saving" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
            <button @click="closeProfile"
              class="px-4 py-3 rounded-xl font-semibold text-sm bg-[#0a0f0b] border border-[#1f3228] text-[#4a6b58] hover:border-[#2a4035] hover:text-[#8fb89f] active:scale-[0.98] transition-all">
              Cancel
            </button>
          </div>

          <!-- Danger zone: Sign out -->
          <div class="pt-1 border-t border-[#131e17]">
            <button @click="handleLogout"
              class="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs text-[#3d5a4a] hover:text-red-400 hover:bg-red-950/20 transition-all font-medium">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Sign out of KeepITs
            </button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>
