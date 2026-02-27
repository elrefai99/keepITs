<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const handleLogout = async () => {
  try {
    await authStore.signOut()
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>

<template>
  <header>
    <nav class="w-full bg-[#0a0f0b]/90 backdrop-blur-md border-b border-[#1a2820] text-white sticky top-0 z-30">
      <div class="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5">

        <!-- Logo -->
        <div class="flex items-center gap-2 select-none">
          <span
            class="text-xl font-black text-white tracking-tighter leading-none"
            style="font-family:'Georgia',serif"
          >
            Keep<span class="text-[#4ade80]">ITs</span>
          </span>
        </div>

        <!-- Right section -->
        <div class="flex items-center gap-3 sm:gap-4">

          <!-- Dark mode toggle -->
          <darkmode />

          <!-- User info & logout -->
          <div
            v-if="authStore.isAuthenticated && authStore.user"
            class="flex items-center gap-2 sm:gap-3"
          >
            <!-- Avatar -->
            <div class="relative">
              <img
                :src="authStore.user.photoURL || '/default-avatar.png'"
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-1 ring-[#2a4035] object-cover"
                :alt="authStore.user.displayName || 'User'"
              />
              <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#4ade80] rounded-full border border-[#0a0f0b]" />
            </div>

            <!-- Name/email (md+) -->
            <div class="hidden md:block">
              <p class="text-xs font-semibold text-[#d4e8dc] leading-tight">
                {{ authStore.user.displayName }}
              </p>
              <p class="text-[10px] text-[#4a6b58] leading-tight">
                {{ authStore.user.email }}
              </p>
            </div>

            <!-- Logout -->
            <button
              @click="handleLogout"
              class="px-3 py-1.5 rounded-lg bg-[#1a2820] border border-[#2a3d30] text-[#8fb89f] text-xs font-medium hover:bg-[#1f3228] hover:text-[#4ade80] hover:border-[#4ade80]/30 active:scale-95 transition-all duration-150"
            >
              <span class="hidden sm:inline">Sign out</span>
              <span class="sm:hidden">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              </span>
            </button>
          </div>
        </div>

      </div>
    </nav>
  </header>
</template>
