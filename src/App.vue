<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from './stores/store';

const store = useScheduleStore()
    
    // Load user tasks from Firebase on mount
    onMounted(async () => {
      if (!store.synced) {
        await store.loadUserTasks()
      }
    })
    
    const currentDate: any = ref(new Date())
    const selectedDate: any = ref<Date | number>(new Date())
    const calendarView = ref<'day' | 'week' | 'month'>('month')
    const showAddForm: any = ref(false)
    const newTask: any = ref({
      title: '',
      time: '09:00',
      description: '',
      completed: false,
      meetingType: 'none',
      meetingUrl: '',
      guestEmailsText: ''
    })
    
    // Timer state
    const currentTime = ref(new Date())
    const timerMinutes = ref(50)
    const timerSeconds = ref(0)
    const isTimerRunning = ref(false)
    const isBreakTime = ref(false)
    const timerInterval: any = ref(null)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Update current time every second and check tasks
    setInterval(() => {
      currentTime.value = new Date()
      checkAndCompletePassedTasks()
    }, 1000)
    
    const currentTimeFormatted = computed(() => {
      const hours = String(currentTime.value.getHours()).padStart(2, '0')
      const minutes = String(currentTime.value.getMinutes()).padStart(2, '0')
      const seconds = String(currentTime.value.getSeconds()).padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
    })
    
    // Get current time in HH:MM format for comparison
    const getCurrentTimeString = () => {
      const hours = String(currentTime.value.getHours()).padStart(2, '0')
      const minutes = String(currentTime.value.getMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    }
    
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    const isDateDisabled = (date: Date) => {
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      return checkDate < today  
    }
    
    const calendarDays = computed(() => {
      const year = currentDate.value.getFullYear()
      const month = currentDate.value.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const daysInMonth = lastDay.getDate()
      const startingDayOfWeek = firstDay.getDay()
      
      const days = []
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null)
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i))
      }
      return days
    })

    const getWeekStart = (date: Date) => {
      const d = new Date(date)
      const day = d.getDay()
      d.setDate(d.getDate() - day)
      d.setHours(0, 0, 0, 0)
      return d
    }

    const weekCalendarDays = computed(() => {
      const base = selectedDate.value || today
      const start = getWeekStart(base)
      const days: (Date | null)[] = []
      for (let i = 0; i < 7; i++) {
        const current = new Date(start)
        current.setDate(start.getDate() + i)
        days.push(current)
      }
      return days
    })

    const dayCalendarDays = computed(() => {
      if (!selectedDate.value) return []
      return [selectedDate.value]
    })

    const displayedCalendarDays = computed(() => {
      if (calendarView.value === 'month') return calendarDays.value
      if (calendarView.value === 'week') return weekCalendarDays.value
      if (calendarView.value === 'day') return dayCalendarDays.value
      return calendarDays.value
    })
    
    const monthName = computed(() => monthNames[currentDate.value.getMonth()])
    const currentYear = computed(() => currentDate.value.getFullYear())
    const todayFormatted = computed(() => formatDate(today))

    const calendarTitle = computed(() => {
      if (calendarView.value === 'month') {
        return `${monthName.value} ${currentYear.value}`
      }

      if (calendarView.value === 'week') {
        const base = selectedDate.value || today
        const start = getWeekStart(base)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        return `Week ${formatDate(start)} - ${formatDate(end)}`
      }

      const base = selectedDate.value || today
      return `Day ${formatDate(base)}`
    })
    
    const currentTasks = computed(() => {
      if (!selectedDate.value) return []
      const dateKey = formatDate(selectedDate.value)
      return store.getTasksForDate(dateKey).sort((a, b) => a.time.localeCompare(b.time))
    })
    
    // Get next upcoming task for today
    const nextTask = computed(() => {
      const dateKey = todayFormatted.value
      const tasks = store.getTasksForDate(dateKey)
        .filter(task => !task.completed)
        .sort((a, b) => a.time.localeCompare(b.time))
      
      const currentTimeStr = getCurrentTimeString()
      return tasks.find(task => task.time > currentTimeStr) || null
    })
    
    // Get current active task (task whose time has started but not yet completed)
    const currentActiveTask = computed(() => {
      const dateKey = todayFormatted.value
      const tasks = store.getTasksForDate(dateKey)
        .filter(task => !task.completed)
        .sort((a, b) => a.time.localeCompare(b.time))
      
      const currentTimeStr = getCurrentTimeString()
      
      // Find the last task that has started (time <= current time)
      let activeTask = null
      for (const task of tasks) {
        if (task.time <= currentTimeStr) {
          activeTask = task
        } else {
          break
        }
      }
      return activeTask
    })
    
    // Auto-complete tasks when their time has passed
    const checkAndCompletePassedTasks = () => {
      const dateKey = todayFormatted.value
      const tasks = store.getTasksForDate(dateKey)
      const currentTimeStr = getCurrentTimeString()
      
      tasks.forEach(task => {
        if (!task.completed && task.time < currentTimeStr) {
          // Check if this task's time has passed
          const taskIndex = tasks.findIndex(t => t.id === task.id)
          const nextTaskInList = tasks[taskIndex + 1]
          
          // Auto-complete if:
          // 1. There's a next task and current time >= next task time, OR
          // 2. There's no next task and current time is at least 1 hour past this task
          if (nextTaskInList) {
            if (currentTimeStr >= nextTaskInList.time) {
              store.toggleTaskComplete(dateKey, task.id)
            }
          } else {
            // For the last task, auto-complete after 1 hour
            const [taskHour, taskMin] = task.time.split(':').map(Number)
            const [currentHour, currentMin] = currentTimeStr.split(':').map(Number)
            const taskMinutes = taskHour * 60 + taskMin
            const currentMinutes = currentHour * 60 + currentMin
            
            if (currentMinutes >= taskMinutes + 60) {
              store.toggleTaskComplete(dateKey, task.id)
            }
          }
        }
      })
    }
    
    // Check if a task is the current active one
    const isCurrentTask = (taskId: string) => {
      return currentActiveTask.value?.id === taskId
    }
    
    // Check if a task is the next upcoming one
    const isNextTask = (taskId: string) => {
      return nextTask.value?.id === taskId
    }
    
    const hasTasksOnDate = (date: Date) => {
      const dateKey = formatDate(date)
      return store.getTasksForDate(dateKey).length > 0
    }

    const getTaskCountForDate = (date: Date) => {
      const dateKey = formatDate(date)
      return store.getTasksForDate(dateKey).length
    }

    const getMeetingCountForDate = (date: Date) => {
      const dateKey = formatDate(date)
      return store.getTasksForDate(dateKey).filter(task => task.meetingUrl).length
    }

    const getTasksForDay = (date: Date) => {
      const dateKey = formatDate(date)
      return store.getTasksForDate(dateKey).slice().sort((a, b) => a.time.localeCompare(b.time))
    }

    // Time slots for Google Calendar-style views (6 AM to 11 PM)
    const timeSlots = computed(() => {
      const slots = []
      for (let hour = 6; hour <= 23; hour++) {
        slots.push(hour)
      }
      return slots
    })

    // Format hour for display
    const formatHour = (hour: number) => {
      if (hour === 0) return '12 AM'
      if (hour < 12) return `${hour} AM`
      if (hour === 12) return '12 PM'
      return `${hour - 12} PM`
    }

    // Calculate task position and height based on time
    const getTaskPosition = (timeStr: string) => {
      const [hourStr, minuteStr] = timeStr.split(':')
      const hour = parseInt(hourStr) || 0
      const minute = parseInt(minuteStr) || 0
      
      // Start from 6 AM (hour 6)
      const startHour = 6
      if (hour < startHour) return { top: 0, height: 60, display: false }
      
      // Calculate position: each hour = 60px, each minute = 1px
      const top = ((hour - startHour) * 60) + minute
      // Default height: 60px (1 hour), can be adjusted
      const height = 60
      
      return { top, height, display: true }
    }

    // Get tasks for a specific day and time slot
    const getTasksForDayAndHour = (date: Date, hour: number) => {
      const dateKey = formatDate(date)
      const tasks = store.getTasksForDate(dateKey)
      return tasks.filter(task => {
        const [taskHour] = task.time.split(':')
        return parseInt(taskHour) === hour
      }).sort((a, b) => a.time.localeCompare(b.time))
    }

    const openGoogleCalendarForTask = () => {
      if (!selectedDate.value) return

      const title = newTask.value.title || 'Meeting'

      const descriptionParts: string[] = []
      if (newTask.value.description) descriptionParts.push(newTask.value.description)
      if (newTask.value.meetingUrl) descriptionParts.push(`Meeting link: ${newTask.value.meetingUrl}`)
      const details = descriptionParts.join('\\n\\n')

      const [hourStr, minuteStr] = (newTask.value.time || '09:00').split(':')
      const hour = Number(hourStr) || 9
      const minute = Number(minuteStr) || 0

      const start = new Date(selectedDate.value)
      start.setHours(hour, minute, 0, 0)
      const end = new Date(start)
      end.setMinutes(start.getMinutes() + 30)

      const formatForGoogle = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
      }

      const datesParam = `${formatForGoogle(start)}/${formatForGoogle(end)}`

      const guests = (newTask.value.guestEmailsText || '')
        .split(/[,;]+/)
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0)

      const baseUrl = 'https://calendar.google.com/calendar/u/0/r/eventedit'
      const params = new URLSearchParams()
      params.set('text', title)
      params.set('dates', datesParam)
      if (details) params.set('details', details)
      if (guests.length) params.set('add', guests.join(','))
      if (newTask.value.meetingUrl) params.set('location', newTask.value.meetingUrl)

      const url = `${baseUrl}?${params.toString()}`
      window.open(url, '_blank')
    }
    
    const getDayClass = (day: Date) => {
      if (!day) return ''
      
      const dateKey = formatDate(day)
      const isToday = dateKey === todayFormatted.value
      const isSelected = selectedDate.value && dateKey === formatDate(selectedDate.value)
      const disabled = isDateDisabled(day)
      const hasTasks = hasTasksOnDate(day)
      
      return {
        disabled,
        today: isToday,
        selected: isSelected,
        'has-tasks': hasTasks
      }
    }
    
    const changeMonth = (delta: number) => {
      if (calendarView.value === 'month') {
        currentDate.value = new Date(
          currentDate.value.getFullYear(),
          currentDate.value.getMonth() + delta,
          1
        )
        return
      }

      // For week/day views, move the selected date
      const base = selectedDate.value || today
      const newDate = new Date(base)

      if (calendarView.value === 'week') {
        newDate.setDate(newDate.getDate() + delta * 7)
      } else {
        // day view
        newDate.setDate(newDate.getDate() + delta)
      }

      selectedDate.value = newDate
      currentDate.value = newDate
    }
    
    const handleDateClick = (date: Date) => {
      // Allow selecting past dates for view-only mode
      selectedDate.value = date
      showAddForm.value = false
    }
    
    const handleAddTask = () => {
      if (!newTask.value.title || !selectedDate.value) return
      
      const dateKey = formatDate(selectedDate.value)

      const guests = (newTask.value.guestEmailsText || '')
        .split(/[,;]+/)
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0)

      store.addTask(dateKey, {
        ...newTask.value,
        guestEmails: guests
      })
      
      newTask.value = {
        title: '',
        time: '09:00',
        description: '',
        completed: false,
        meetingType: 'none',
        meetingUrl: '',
        guestEmailsText: ''
      }
      showAddForm.value = false
    }
    
    const toggleComplete = (taskId: string) => {
      // Read-only for past dates
      if (!selectedDate.value || isDateDisabled(selectedDate.value)) return
      const dateKey = formatDate(selectedDate.value)
      store.toggleTaskComplete(dateKey, taskId)
    }
    
    const deleteTaskItem = (taskId: string) => {
      // Read-only for past dates
      if (!selectedDate.value || isDateDisabled(selectedDate.value)) return
      const dateKey = formatDate(selectedDate.value)
      store.deleteTask(dateKey, taskId)
    }
    
    // Timer functions
    const startTimer = () => {
      if (isTimerRunning.value) return
      
      isTimerRunning.value = true
      timerInterval.value = setInterval(() => {
        if (timerSeconds.value === 0) {
          if (timerMinutes.value === 0) {
            // Timer reached 0
            stopTimer()
            showNotification()
            return
          }
          timerMinutes.value--
          timerSeconds.value = 59
        } else {
          timerSeconds.value--
        }
      }, 1000)
    }
    
    const pauseTimer = () => {
      isTimerRunning.value = false
      if (timerInterval.value) {
        clearInterval(timerInterval.value)
        timerInterval.value = null
      }
    }
    
    const resetTimer = () => {
      pauseTimer()
      if (isBreakTime.value) {
        timerMinutes.value = 10
      } else {
        timerMinutes.value = 50
      }
      timerSeconds.value = 0
    }
    
    const stopTimer = () => {
      pauseTimer()
      isBreakTime.value = !isBreakTime.value
      if (isBreakTime.value) {
        timerMinutes.value = 10
      } else {
        timerMinutes.value = 50
      }
      timerSeconds.value = 0
    }
    
    const showNotification = () => {
      const message = isBreakTime.value 
        ? '🎉 Break time is over! Ready to get back to work?' 
        : '⏰ Time for a break! You\'ve completed 50 minutes of focused work.'
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Schedule Manager', { body: message })
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Schedule Manager', { body: message })
          }
        })
      }
      
      alert(message)
    }
    
    const timerDisplay = computed(() => {
      const mins = String(timerMinutes.value).padStart(2, '0')
      const secs = String(timerSeconds.value).padStart(2, '0')
      return `${mins}:${secs}`
    })
  
</script>

<template>
  <navbar />
  <div min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4 font-sans transition-colors duration-300>
    <div max-w-6xl mx-auto>
      <div bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden transition-colors duration-300 class="dark:shadow-gray-900/50">
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

        <div p-3 sm:p-4 md:p-6>
          <!-- Calendar View -->
          <div>
            <div bg-gray-50 dark:bg-gray-700 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 transition-colors duration-300>
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-2 sm:mb-3 md:mb-4">
                <div class="flex gap-1 sm:gap-2 w-full sm:w-auto">
                  <button
                    @click="calendarView = 'day'"
                    :class="[
                      'flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-[10px] sm:text-xs md:text-sm border border-transparent transition-colors font-medium',
                      calendarView === 'day'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-transparent text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    ]"
                  >
                    Day
                  </button>
                  <button
                    @click="calendarView = 'week'"
                    :class="[
                      'flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-[10px] sm:text-xs md:text-sm border border-transparent transition-colors font-medium',
                      calendarView === 'week'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-transparent text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    ]"
                  >
                    Week
                  </button>
                  <button
                    @click="calendarView = 'month'"
                    :class="[
                      'flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-1 rounded-md text-[10px] sm:text-xs md:text-sm border border-transparent transition-colors font-medium',
                      calendarView === 'month'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-transparent text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    ]"
                  >
                    Month
                  </button>
                </div>
                <div class="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <button @click="changeMonth(-1)" class="bg-transparent border-none p-1.5 sm:p-2 cursor-pointer rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 stroke-2 text-gray-800 dark:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <h2 class="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-100 text-center flex-1 sm:flex-none min-w-0 truncate sm:min-w-fit">
                    {{ calendarTitle }}
                  </h2>
                  <button @click="changeMonth(1)" class="bg-transparent border-none p-1.5 sm:p-2 cursor-pointer rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 stroke-2 text-gray-800 dark:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Month View -->
              <template v-if="calendarView === 'month'">
                <div class="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-2 mb-1 sm:mb-2">
                  <div v-for="day in weekDays" :key="day" class="text-center text-[10px] sm:text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400 p-1 sm:p-1.5 md:p-2">{{ day }}</div>
                </div>

                <div class="grid grid-cols-7 gap-0.5 sm:gap-1 md:gap-2">
                  <button
                    v-for="(day, index) in displayedCalendarDays"
                    :key="index"
                    @click="day && handleDateClick(day)"
                    :disabled="!day"
                    :class="[
                      'min-h-12 sm:min-h-14 md:min-h-16 lg:min-h-20 p-1 sm:p-1.5 md:p-2 rounded-none text-[10px] sm:text-xs md:text-sm font-medium cursor-pointer bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all relative flex flex-col items-start justify-start border border-gray-200 dark:border-gray-600',
                      {
                        'hover:bg-gray-50 dark:hover:bg-gray-600': day && !isDateDisabled(day),
                        'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500': day && isDateDisabled(day),
                        'ring-1 ring-blue-500 dark:ring-blue-400': selectedDate && day && formatDate(day) === formatDate(selectedDate),
                        'bg-blue-50/60 dark:bg-blue-900/40': selectedDate && day && formatDate(day) === formatDate(selectedDate),
                        'bg-blue-50 dark:bg-blue-900/30': day && !isDateDisabled(day) && formatDate(day) === todayFormatted && !(selectedDate && formatDate(day) === formatDate(selectedDate))
                      }
                    ]"
                  >
                    <template v-if="day">
                      <div class="flex items-center justify-between w-full">
                        <span
                          :class="[
                            'text-[10px] sm:text-xs md:text-sm font-semibold',
                            formatDate(day) === todayFormatted
                              ? 'text-blue-600 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-200'
                          ]"
                        >
                          {{ day.getDate() }}
                        </span>
                        <span
                          v-if="getTaskCountForDate(day)"
                          class="ml-auto px-1 sm:px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800 text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-blue-700 dark:text-blue-200"
                        >
                          {{ getTaskCountForDate(day) }}
                        </span>
                      </div>

                      <div
                        v-if="getTaskCountForDate(day)"
                        class="mt-0.5 sm:mt-1 text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] font-medium text-gray-500 dark:text-gray-300 truncate w-full flex items-center gap-0.5 sm:gap-1"
                      >
                        <span>
                          {{ getTaskCountForDate(day) }}<span class="hidden sm:inline"> task</span><span v-if="getTaskCountForDate(day) > 1" class="hidden sm:inline">s</span>
                        </span>
                        <span
                          v-if="getMeetingCountForDate(day)"
                          class="text-blue-600 dark:text-blue-300"
                        >
                          <span class="hidden sm:inline">· </span>{{ getMeetingCountForDate(day) }}<span class="hidden sm:inline"> meeting</span><span v-if="getMeetingCountForDate(day) > 1" class="hidden sm:inline">s</span>
                        </span>
                      </div>
                    </template>
                  </button>
                </div>
              </template>

              <!-- Week View - Google Calendar Style -->
              <template v-else-if="calendarView === 'week'">
                <div class="flex border-b border-gray-200 dark:border-gray-600 overflow-x-auto">
                  <div class="w-12 sm:w-16 md:w-20 flex-shrink-0"></div>
                  <div class="flex-1 grid grid-cols-7 min-w-[700px] sm:min-w-0 border-l border-gray-200 dark:border-gray-600">
                    <template
                      v-for="(day, index) in weekCalendarDays"
                      :key="index"
                    >
                      <div
                        v-if="day"
                        @click="handleDateClick(day)"
                        :class="[
                          'p-1.5 sm:p-2 md:p-3 text-center border-r border-gray-200 dark:border-gray-600 cursor-pointer transition-colors',
                          formatDate(day) === todayFormatted
                            ? 'bg-blue-50 dark:bg-blue-900/30'
                            : 'bg-white dark:bg-gray-700',
                          selectedDate && formatDate(day) === formatDate(selectedDate)
                            ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                            : ''
                        ]"
                      >
                        <div class="text-[10px] sm:text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">
                          {{ weekDays[day.getDay()] }}
                        </div>
                        <div
                          :class="[
                            'text-sm sm:text-base md:text-lg font-semibold',
                            formatDate(day) === todayFormatted
                              ? 'text-blue-600 dark:text-blue-300'
                              : 'text-gray-800 dark:text-gray-200'
                          ]"
                        >
                          {{ day.getDate() }}
                        </div>
                      </div>
                    </template>
                  </div>
                </div>

                <div class="flex overflow-x-auto">
                  <div class="w-12 sm:w-16 md:w-20 flex-shrink-0">
                    <div
                      v-for="hour in timeSlots"
                      :key="hour"
                      class="h-12 sm:h-14 md:h-16 border-b border-gray-100 dark:border-gray-700 relative"
                    >
                      <div class="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 -mt-2.5 sm:-mt-3 pr-1 sm:pr-2 text-right">
                        {{ formatHour(hour) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex-1 grid grid-cols-7 min-w-[700px] sm:min-w-0 border-l border-gray-200 dark:border-gray-600">
                    <template
                      v-for="(day, dayIndex) in weekCalendarDays"
                      :key="dayIndex"
                    >
                      <div
                        v-if="day"
                        class="relative border-r border-gray-200 dark:border-gray-600"
                      >
                        <div
                          v-for="hour in timeSlots"
                          :key="hour"
                          @click="handleDateClick(day)"
                          class="h-12 sm:h-14 md:h-16 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/50 cursor-pointer transition-colors relative"
                        >
                          <div
                            v-for="task in getTasksForDayAndHour(day, hour)"
                            :key="task.id"
                            :style="{
                              top: `${getTaskPosition(task.time).top % 60}px`,
                              height: `${getTaskPosition(task.time).height}px`
                            }"
                            :class="[
                              'absolute left-0.5 right-0.5 rounded px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] md:text-xs font-medium cursor-pointer z-10 overflow-hidden',
                              task.meetingUrl
                                ? 'bg-blue-500 dark:bg-blue-600 text-white'
                                : 'bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200'
                            ]"
                            @click.stop="handleDateClick(day)"
                          >
                            <div class="font-semibold truncate">{{ task.time }}</div>
                            <div class="truncate hidden sm:block">{{ task.title }}</div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </template>

              <!-- Day View - Google Calendar Style -->
              <template v-else-if="calendarView === 'day'">
                <div v-if="selectedDate" class="flex border-b border-gray-200 dark:border-gray-600">
                  <div class="w-12 sm:w-16 md:w-20 flex-shrink-0"></div>
                  <div
                    class="flex-1 p-2 sm:p-3 text-center border-l border-gray-200 dark:border-gray-600"
                    :class="[
                      formatDate(selectedDate) === todayFormatted
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'bg-white dark:bg-gray-700'
                    ]"
                  >
                    <div class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {{ weekDays[selectedDate.getDay()] }}
                    </div>
                    <div
                      :class="[
                        'text-base sm:text-lg font-semibold',
                        formatDate(selectedDate) === todayFormatted
                          ? 'text-blue-600 dark:text-blue-300'
                          : 'text-gray-800 dark:text-gray-200'
                      ]"
                    >
                      {{ selectedDate.getDate() }}
                    </div>
                  </div>
                </div>

                <div v-if="selectedDate" class="flex overflow-x-auto">
                  <div class="w-12 sm:w-16 md:w-20 flex-shrink-0">
                    <div
                      v-for="hour in timeSlots"
                      :key="hour"
                      class="h-12 sm:h-14 md:h-16 border-b border-gray-100 dark:border-gray-700 relative"
                    >
                      <div class="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 -mt-2.5 sm:-mt-3 pr-1 sm:pr-2 text-right">
                        {{ formatHour(hour) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex-1 border-l border-gray-200 dark:border-gray-600 relative min-w-0">
                    <div
                      v-for="hour in timeSlots"
                      :key="hour"
                      @click="handleDateClick(selectedDate)"
                      class="h-12 sm:h-14 md:h-16 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/50 cursor-pointer transition-colors relative"
                    >
                      <div
                        v-for="task in getTasksForDayAndHour(selectedDate, hour)"
                        :key="task.id"
                        :style="{
                          top: `${getTaskPosition(task.time).top % 60}px`,
                          height: `${getTaskPosition(task.time).height}px`
                        }"
                        :class="[
                          'absolute left-1 right-1 rounded px-1.5 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium cursor-pointer z-10 overflow-hidden shadow-sm',
                          task.meetingUrl
                            ? 'bg-blue-500 dark:bg-blue-600 text-white'
                            : 'bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200'
                        ]"
                        @click.stop="handleDateClick(selectedDate)"
                      >
                        <div class="font-semibold truncate">{{ task.time }}</div>
                        <div class="truncate">{{ task.title }}</div>
                        <div v-if="task.description" class="text-[9px] sm:text-[10px] opacity-75 truncate mt-0.5 hidden sm:block">
                          {{ task.description }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="flex items-center justify-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
                  <p class="text-xs sm:text-sm">Select a date to view</p>
                </div>
              </template>
            </div>
          </div>

          <!-- Day Detail View (under calendar) -->
          <div mt-3 sm:mt-4 md:mt-6>
            <div v-if="selectedDate" bg-gray-50 dark:bg-gray-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-colors duration-300>
              <div flex justify-between items-center mb-3 sm:mb-4 flex-wrap gap-2>
                <h2 class="text-base sm:text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100">{{ formatDate(selectedDate) }}</h2>
                <button
                  v-if="!isDateDisabled(selectedDate)"
                  @click="showAddForm = true"
                  class="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-blue-600 dark:bg-blue-500 text-white border-none rounded-lg cursor-pointer text-xs sm:text-sm font-medium transition-colors hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <svg class="w-4 h-4 sm:w-5 sm:h-5 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span class="hidden sm:inline">Add Task</span>
                  <span class="sm:hidden">Add</span>
                </button>
              </div>

              <!-- Tasks List -->
              <div max-h-96 sm:max-h-100 overflow-y-auto>
                <div v-if="currentTasks.length === 0" class="text-center py-8 sm:py-12 px-4 text-gray-500 dark:text-gray-400">
                  <svg class="w-10 h-10 sm:w-12 sm:h-12 stroke-2 opacity-50 mb-2 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p class="text-sm sm:text-base">No tasks scheduled</p>
                </div>

                <div
                  v-for="task in currentTasks"
                  :key="task.id"
                  :class="[
                    'bg-white dark:bg-gray-600 p-3 sm:p-4 rounded-lg mb-2 sm:mb-3 shadow-sm flex justify-between items-start transition-colors duration-300',
                    { 'opacity-60': task.completed },
                    { 'ring-2 ring-emerald-500 dark:ring-emerald-400 bg-emerald-50 dark:bg-emerald-900/20': isCurrentTask(task.id) && formatDate(selectedDate) === todayFormatted },
                    { 'ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50 dark:bg-blue-900/20': isNextTask(task.id) && formatDate(selectedDate) === todayFormatted }
                  ]"
                >
                  <div class="flex gap-2 sm:gap-3 flex-1 min-w-0">
                    <button
                      @click="toggleComplete(task.id)"
                      :disabled="isDateDisabled(selectedDate)"
                      :class="[
                        'w-4 h-4 sm:w-5 sm:h-5 min-w-4 sm:min-w-5 border-2 rounded flex items-center justify-center cursor-pointer transition-all mt-0.5 sm:mt-1 flex-shrink-0',
                        task.completed 
                          ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600' 
                          : 'bg-transparent border-gray-300 dark:border-gray-400 hover:border-emerald-500 dark:hover:border-emerald-400',
                        { 'cursor-not-allowed': isDateDisabled(selectedDate) }
                      ]"
                    >
                      <svg v-if="task.completed" class="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1 sm:gap-2 flex-wrap mb-1">
                        <div class="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-semibold">
                          <svg class="w-3 h-3 sm:w-4 sm:h-4 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <span>{{ task.time }}</span>
                        </div>
                        <span 
                          v-if="isCurrentTask(task.id) && formatDate(selectedDate) === todayFormatted"
                          class="px-1.5 sm:px-2 py-0.5 bg-emerald-500 dark:bg-emerald-600 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center gap-0.5 sm:gap-1"
                        >
                          <svg class="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                          <span class="hidden sm:inline">ACTIVE NOW</span>
                          <span class="sm:hidden">ACTIVE</span>
                        </span>
                        <span 
                          v-if="isNextTask(task.id) && formatDate(selectedDate) === todayFormatted"
                          class="px-1.5 sm:px-2 py-0.5 bg-blue-500 dark:bg-blue-600 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center gap-0.5 sm:gap-1"
                        >
                          <svg class="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                          <span class="hidden sm:inline">UP NEXT</span>
                          <span class="sm:hidden">NEXT</span>
                        </span>
                      </div>
                      <h3 :class="['text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 mb-1 break-words', { 'line-through': task.completed }]">{{ task.title }}</h3>
                      <p v-if="task.description" class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">{{ task.description }}</p>

                      <div v-if="task.meetingUrl" class="mt-2 flex items-center gap-2">
                        <span
                          v-if="task.meetingType === 'google'"
                          class="px-1.5 py-0.5 rounded-full bg-green-100 text-[10px] sm:text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-200"
                        >
                          Google Meet
                        </span>
                        <span
                          v-else-if="task.meetingType === 'teams'"
                          class="px-1.5 py-0.5 rounded-full bg-purple-100 text-[10px] sm:text-xs font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-200"
                        >
                          Microsoft Teams
                        </span>
                        <a
                          :href="task.meetingUrl"
                          target="_blank"
                          rel="noreferrer"
                          class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-600 text-white text-[10px] sm:text-xs font-medium hover:bg-blue-700"
                        >
                          <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14 3h7v7"/>
                            <path d="M10 14L21 3"/>
                            <path d="M5 5v14h14"/>
                          </svg>
                          Join meeting
                        </a>
                      </div>
                    </div>
                  </div>
                  <button
                    v-if="!isDateDisabled(selectedDate)"
                    @click="deleteTaskItem(task.id)"
                    class="bg-transparent border-none p-1 text-red-500 dark:text-red-400 cursor-pointer rounded transition-colors hover:bg-red-100 dark:hover:bg-red-900/30 flex-shrink-0"
                  >
                    <svg class="w-4 h-4 sm:w-5 sm:h-5 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div v-if="isDateDisabled(selectedDate)" class="mt-3 sm:mt-4 p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg text-xs sm:text-sm text-amber-800 dark:text-amber-300 transition-colors duration-300">
                This date is in the past. Viewing only.
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center py-8 sm:py-12 text-gray-500 dark:text-gray-400 text-center">
              <svg class="w-12 h-12 sm:w-16 sm:h-16 stroke-2 opacity-50 mb-3 sm:mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <p class="text-sm sm:text-base">Select a date to view or add tasks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add Task Modal -->
  <div
    v-if="showAddForm && selectedDate && !isDateDisabled(selectedDate)"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
    @click.self="showAddForm = false"
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl w-full max-w-md p-3 sm:p-4 md:p-6 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-2 sm:mb-3 md:mb-4">
        <h3 class="text-sm sm:text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100 pr-2">
          Add Task – {{ formatDate(selectedDate) }}
        </h3>
        <button
          @click="showAddForm = false"
          class="bg-transparent border-none text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer text-lg sm:text-xl md:text-2xl leading-none flex-shrink-0"
        >
          ✕
        </button>
      </div>

      <div>
        <input
          v-model="newTask.title"
          type="text"
          placeholder="Task title"
          class="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg mb-2 sm:mb-3 font-sans text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 sm:focus:ring-3 focus:ring-blue-600/10 dark:focus:ring-blue-400/20 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <input
          v-model="newTask.time"
          type="time"
          class="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg mb-2 sm:mb-3 font-sans text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 sm:focus:ring-3 focus:ring-blue-600/10 dark:focus:ring-blue-400/20 transition-colors"
        />
        <textarea
          v-model="newTask.description"
          placeholder="Description (optional)"
          class="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg mb-2 sm:mb-3 font-sans text-sm resize-none focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 sm:focus:ring-3 focus:ring-blue-600/10 dark:focus:ring-blue-400/20 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
          rows="3"
        ></textarea>
        <div class="mb-2 sm:mb-3">
          <label class="block text-xs sm:text-sm font-medium text-gray-200 mb-1">Meeting</label>
          <div class="flex flex-col gap-2">
            <select
              v-model="newTask.meetingType"
              class="w-full p-2.5 sm:p-2.5 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 sm:focus:ring-3 focus:ring-blue-600/10 dark:focus:ring-blue-400/20 transition-colors"
            >
              <option value="none">No meeting</option>
              <option value="google">Google Meet</option>
              <option value="teams">Microsoft Teams</option>
              <option value="custom">Other link</option>
            </select>
            <input
              v-if="newTask.meetingType !== 'none'"
              v-model="newTask.meetingUrl"
              type="url"
              placeholder="Paste meeting link (e.g. Google Meet or Teams)"
              class="w-full p-2.5 sm:p-2.5 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 sm:focus:ring-3 focus:ring-blue-600/10 dark:focus:ring-blue-400/20 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
              <input
                v-model="newTask.guestEmailsText"
                type="text"
                placeholder="Guest emails (comma separated)"
                class="w-full sm:flex-1 p-2.5 sm:p-2.5 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-[10px] sm:text-xs focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-2 sm:focus:ring-3 focus:ring-blue-600/10 dark:focus:ring-blue-400/20 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <button
                type="button"
                @click="openGoogleCalendarForTask"
                class="px-2.5 sm:px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-medium border-none cursor-pointer flex items-center gap-1"
              >
                <svg class="w-3.5 h-3.5 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Google Calendar
              </button>
            </div>
            <p class="mt-1 text-[10px] sm:text-xs text-gray-400">
              This opens Google Calendar with this meeting pre-filled so you can send email invites.
            </p>
          </div>
        </div>
        <div class="flex gap-2 mt-2">
          <button @click="handleAddTask" class="flex-1 p-2.5 sm:p-3 border-none rounded-lg cursor-pointer text-sm sm:text-base font-medium transition-all bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700">
            Save
          </button>
          <button @click="showAddForm = false" class="flex-1 p-2.5 sm:p-3 border-none rounded-lg cursor-pointer text-sm sm:text-base font-medium transition-all bg-gray-200 dark:bg-gray-500 text-gray-700 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

