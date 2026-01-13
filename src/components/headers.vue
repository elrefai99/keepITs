<template>
             <div class="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 p-6 text-white transition-colors duration-300">
          <div class="flex justify-between items-center flex-wrap gap-4">
            <div class="flex items-center gap-3">
              <svg class="w-8 h-8 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <h1 class="text-3xl font-bold">Schedule Manager</h1>
            </div>
            <div class="text-sm opacity-90">Today: {{ todayFormatted }}</div>
          </div>
        </div>
</template>
