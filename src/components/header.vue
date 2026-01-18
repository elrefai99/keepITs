<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from '../stores/store';
import { formatDate, formatHour, isDateDisabled,weekDays } from '../utils/dateUtils'
import { useCalendar } from '../shared/useCalendar'
import { useTaskLogic } from '../shared/useTaskLogic'
import { useTimer } from '../shared/useTimer'
import { useNotifications } from '../shared/useNotifications';

    const store = useScheduleStore()
    
    // Calendar Logic
    const {todayFormatted,selectedDate} = useCalendar()

    // Time State
    const currentTime = ref(new Date())
    
    // Task Logic
    const {nextTask,currentActiveTask,checkAndCompletePassedTasks} = useTaskLogic(store, selectedDate, todayFormatted, currentTime)

    // Timer Logic
    const triggerNotification = ref(() => {})
    const onTimerComplete = () => {triggerNotification.value()}
    
    const {isTimerRunning,isBreakTime,timerDisplay,startTimer,pauseTimer,resetTimer} = useTimer(currentActiveTask, onTimerComplete)
    
    const {checkUpcomingTasks,checkDayChange,showNotification} = useNotifications(store, todayFormatted, isBreakTime)
    
    // Assign the real function
    triggerNotification.value = showNotification



    const currentTimeFormatted = computed(() => {
      const hours = String(currentTime.value.getHours()).padStart(2, '0')
      const minutes = String(currentTime.value.getMinutes()).padStart(2, '0')
      const seconds = String(currentTime.value.getSeconds()).padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
    })
    
    // Lifecycle
    onMounted(async () => {
      if (!store.synced) {
        await store.loadUserTasks()
      }
      
      checkDayChange()
      
      setInterval(() => {
        currentTime.value = new Date()
        checkAndCompletePassedTasks()
        checkUpcomingTasks()
      }, 1000)
      
      setInterval(checkDayChange, 60000)
    })

</script>

<template>
             <!-- Header -->
        <div bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 p-3 sm:p-4 md:p-6 text-white transition-colors duration-300>
          <div flex justify-between items-center flex-wrap gap-2 sm:gap-4>
            <div flex items-center gap-2 sm:gap-3>
              <svg class="w-6 h-6 sm:w-8 sm:h-8 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <h1 class="text-xl sm:text-2xl md:text-3xl font-bold">Schedule Manager</h1>
            </div>
            <div flex flex-col items-end gap-1 sm:gap-2>
              <div class="text-xs sm:text-sm opacity-90">Today: {{ todayFormatted }}</div>
              <div class="text-sm sm:text-lg font-semibold">Time: {{ currentTimeFormatted }}</div>
            </div>
          </div>
          
          <!-- Pomodoro Timer -->
          <div class="bg-white/10 mt-3 sm:mt-4 md:mt-6 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4">
            <div flex items-center justify-between flex-wrap gap-2 sm:gap-4>
              <div flex items-center gap-2 sm:gap-3>
                <svg class="w-5 h-5 sm:w-6 sm:h-6 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <div>
                  <div class="text-[10px] sm:text-xs opacity-75">{{ isBreakTime ? 'Break Time' : 'Focus Time' }}</div>
                  <div class="text-2xl sm:text-3xl font-bold font-mono">{{ timerDisplay }}</div>
                </div>
              </div>
              <div flex gap-1 sm:gap-2>
                <button 
                  v-if="!isTimerRunning"
                  @click="startTimer"
                  class="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2"
                >
                  <svg class="w-4 h-4 sm:w-5 sm:h-5 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <span class="hidden sm:inline">Start</span>
                </button>
                <button 
                  v-if="isTimerRunning"
                  @click="pauseTimer"
                  class="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2"
                >
                  <svg class="w-4 h-4 sm:w-5 sm:h-5 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                  </svg>
                  <span class="hidden sm:inline">Pause</span>
                </button>
                <button 
                  @click="resetTimer"
                  class="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2"
                >
                  <svg class="w-4 h-4 sm:w-5 sm:h-5 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                  </svg>
                  <span class="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>
            
            <!-- Next Task Preview -->
            <div v-if="currentActiveTask || nextTask" class="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/20">
              <div v-if="currentActiveTask" class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm mb-1 sm:mb-2">
                <span class="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-500/80 rounded text-white font-semibold text-[10px] sm:text-xs">ACTIVE</span>
                <span class="opacity-90 truncate">{{ currentActiveTask.time }}</span>
                <span class="font-medium truncate">{{ currentActiveTask.title }}</span>
              </div>
              <div v-if="nextTask" class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span class="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-500/80 rounded text-white font-semibold text-[10px] sm:text-xs">NEXT</span>
                <span class="opacity-90 truncate">{{ nextTask.time }}</span>
                <span class="font-medium truncate">{{ nextTask.title }}</span>
              </div>
            </div>
          </div>
        </div>
</template>
