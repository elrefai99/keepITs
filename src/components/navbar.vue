<script setup lang="ts">
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
</script>

<template>
  <header>
    <nav class="w-full bg-transparent dark:bg-gray-800 dark:text-gray-200">
      <div class="max-w-xl mx-auto flex items-center justify-between px-6 py-4">

        <!-- Links -->
        <div class="flex items-center gap-8 opacity-80">
          <router-link to="/" active-class="border-b-2 border-current pb-1">Home</router-link>
          <router-link to="/projects" active-class="border-b-2 border-current pb-1">Projects</router-link>
          <a href="/resume.pdf">Resume</a>
          <darkmode />
        </div>

        <!-- Auth Section -->
        <div>
          <!-- لو مش عامل login -->
          <google v-if="!userStore.isLoggedIn" />

          <!-- لو عامل login -->
          <div
            v-else
            class="flex items-center gap-3"
          >
            <img
              :src="userStore.user.picture"
              class="w-8 h-8 rounded-full"
              alt="avatar"
            />
            <span class="text-sm font-medium">
              {{ userStore.user.name }}
            </span>
          </div>
        </div>

      </div>
    </nav>
  </header>
</template>
