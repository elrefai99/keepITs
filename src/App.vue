<script lang="ts">
import { ref, computed } from 'vue'
import { useScheduleStore } from './stores/store';

export default {
  name: 'ScheduleApp',
  
  setup() {
    const store = useScheduleStore()
    
    const currentDate: any = ref(new Date())
    const selectedDate: any = ref<Date | null>(null)
    const showAddForm: any = ref(false)
    const newTask: any = ref({
      title: '',
      time: '09:00',
      description: '',
      completed: false
    })
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
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
    
    const monthName = computed(() => monthNames[currentDate.value.getMonth()])
    const currentYear = computed(() => currentDate.value.getFullYear())
    const todayFormatted = computed(() => formatDate(today))
    
    const currentTasks = computed(() => {
      if (!selectedDate.value) return []
      const dateKey = formatDate(selectedDate.value)
      return store.getTasksForDate(dateKey).sort((a, b) => a.time.localeCompare(b.time))
    })
    
    const hasTasksOnDate = (date: Date) => {
      const dateKey = formatDate(date)
      return store.getTasksForDate(dateKey).length > 0
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
      currentDate.value = new Date(
        currentDate.value.getFullYear(),
        currentDate.value.getMonth() + delta,
        1
      )
    }
    
    const handleDateClick = (date: Date) => {
      if (!isDateDisabled(date)) {
        selectedDate.value = date
        showAddForm.value = false
      }
    }
    
    const handleAddTask = () => {
      if (!newTask.value.title || !selectedDate.value) return
      
      const dateKey = formatDate(selectedDate.value)
      store.addTask(dateKey, { ...newTask.value })
      
      newTask.value = {
        title: '',
        time: '09:00',
        description: '',
        completed: false
      }
      showAddForm.value = false
    }
    
    const toggleComplete = (taskId: string) => {
      const dateKey = formatDate(selectedDate.value)
      store.toggleTaskComplete(dateKey, taskId)
    }
    
    const deleteTaskItem = (taskId: string) => {
      const dateKey = formatDate(selectedDate.value)
      store.deleteTask(dateKey, taskId)
    }
    
    return {
      currentDate,
      selectedDate,
      showAddForm,
      newTask,
      weekDays,
      calendarDays,
      monthName,
      currentYear,
      todayFormatted,
      currentTasks,
      formatDate,
      isDateDisabled,
      hasTasksOnDate,
      getDayClass,
      changeMonth,
      handleDateClick,
      handleAddTask,
      toggleComplete,
      deleteTaskItem
    }
  }
}
</script>

<template>
  <navbar />
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 font-sans transition-colors duration-300">
    <div class="max-w-6xl mx-auto">
      <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl dark:shadow-gray-900/50 overflow-hidden transition-colors duration-300">
        <!-- Header -->
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <!-- Calendar View -->
          <div class="min-h-100">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 transition-colors duration-300">
              <div class="flex justify-between items-center mb-4">
                <button @click="changeMonth(-1)" class="bg-transparent border-none p-2 cursor-pointer rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-600">
                  <svg class="w-5 h-5 stroke-2 text-gray-800 dark:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ monthName }} {{ currentYear }}</h2>
                <button @click="changeMonth(1)" class="bg-transparent border-none p-2 cursor-pointer rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-600">
                  <svg class="w-5 h-5 stroke-2 text-gray-800 dark:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-7 gap-2 mb-2">
                <div v-for="day in weekDays" :key="day" class="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 p-2">{{ day }}</div>
              </div>

              <div class="grid grid-cols-7 gap-2">
                <button
                  v-for="(day, index) in calendarDays"
                  :key="index"
                  @click="day && handleDateClick(day)"
                  :disabled="!day || isDateDisabled(day)"
                  :class="[
                    'aspect-square p-2 rounded-lg text-sm font-medium border-none cursor-pointer bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 transition-all relative flex flex-col items-center justify-center',
                    {
                      'hover:bg-gray-200 dark:hover:bg-gray-500': day && !isDateDisabled(day),
                      'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed': day && isDateDisabled(day),
                      'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold': day && formatDate(day) === todayFormatted && !(selectedDate && formatDate(day) === formatDate(selectedDate)),
                      'bg-blue-600 dark:bg-blue-500 text-white shadow-lg shadow-blue-600/40 dark:shadow-blue-500/40': selectedDate && day && formatDate(day) === formatDate(selectedDate),
                      'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200': day && hasTasksOnDate(day) && !(selectedDate && formatDate(day) === formatDate(selectedDate))
                    }
                  ]"
                >
                  <span v-if="day">{{ day.getDate() }}</span>
                  <div 
                    v-if="day && hasTasksOnDate(day)" 
                    :class="[
                      'w-1.5 h-1.5 rounded-full mt-0.5',
                      selectedDate && formatDate(day) === formatDate(selectedDate) ? 'bg-white' : 'bg-blue-600 dark:bg-blue-400'
                    ]"
                  ></div>
                </button>
              </div>
            </div>
          </div>

          <!-- Day Detail View -->
          <div class="min-h-100">
            <div v-if="selectedDate" class="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 transition-colors duration-300">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">{{ formatDate(selectedDate) }}</h2>
                <button
                  v-if="!isDateDisabled(selectedDate)"
                  @click="showAddForm = !showAddForm"
                  class="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white border-none rounded-lg cursor-pointer font-medium transition-colors hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <svg class="w-5 h-5 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Task
                </button>
              </div>

              <!-- Add Task Form -->
              <div v-if="showAddForm" class="bg-white dark:bg-gray-600 p-4 rounded-lg mb-4 shadow-sm transition-colors duration-300">
                <input
                  v-model="newTask.title"
                  type="text"
                  placeholder="Task title"
                  class="w-full p-3 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg mb-3 font-sans text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-3 focus:ring-blue-600/10 dark:focus:ring-blue-400/20 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <input
                  v-model="newTask.time"
                  type="time"
                  class="w-full p-3 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg mb-3 font-sans text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-3 focus:ring-blue-600/10 dark:focus:ring-blue-400/20 transition-colors"
                />
                <textarea
                  v-model="newTask.description"
                  placeholder="Description (optional)"
                  class="w-full p-3 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-lg mb-3 font-sans text-sm resize-none focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-3 focus:ring-blue-600/10 dark:focus:ring-blue-400/20 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  rows="3"
                ></textarea>
                <div class="flex gap-2">
                  <button @click="handleAddTask" class="flex-1 p-3 border-none rounded-lg cursor-pointer font-medium transition-all bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700">Save</button>
                  <button @click="showAddForm = false" class="flex-1 p-3 border-none rounded-lg cursor-pointer font-medium transition-all bg-gray-200 dark:bg-gray-500 text-gray-700 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-400">Cancel</button>
                </div>
              </div>

              <!-- Tasks List -->
              <div class="max-h-100 overflow-y-auto">
                <div v-if="currentTasks.length === 0" class="text-center py-12 px-4 text-gray-500 dark:text-gray-400">
                  <svg class="w-12 h-12 stroke-2 opacity-50 mb-2 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p>No tasks scheduled</p>
                </div>

                <div
                  v-for="task in currentTasks"
                  :key="task.id"
                  :class="[
                    'bg-white dark:bg-gray-600 p-4 rounded-lg mb-3 shadow-sm flex justify-between items-start transition-colors duration-300',
                    { 'opacity-60': task.completed }
                  ]"
                >
                  <div class="flex gap-3 flex-1">
                    <button
                      @click="toggleComplete(task.id)"
                      :disabled="isDateDisabled(selectedDate)"
                      :class="[
                        'w-5 h-5 min-w-5 border-2 rounded flex items-center justify-center cursor-pointer transition-all mt-1',
                        task.completed 
                          ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600' 
                          : 'bg-transparent border-gray-300 dark:border-gray-400 hover:border-emerald-500 dark:hover:border-emerald-400',
                        { 'cursor-not-allowed': isDateDisabled(selectedDate) }
                      ]"
                    >
                      <svg v-if="task.completed" class="w-3 h-3 stroke-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                    <div class="flex-1">
                      <div class="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-semibold mb-1">
                        <svg class="w-4 h-4 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>{{ task.time }}</span>
                      </div>
                      <h3 :class="['text-base font-semibold text-gray-800 dark:text-gray-100 mb-1', { 'line-through': task.completed }]">{{ task.title }}</h3>
                      <p v-if="task.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ task.description }}</p>
                    </div>
                  </div>
                  <button
                    v-if="!isDateDisabled(selectedDate)"
                    @click="deleteTaskItem(task.id)"
                    class="bg-transparent border-none p-1 text-red-500 dark:text-red-400 cursor-pointer rounded transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <svg class="w-5 h-5 stroke-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div v-if="isDateDisabled(selectedDate)" class="mt-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300 transition-colors duration-300">
                This date is in the past. Viewing only.
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center h-full min-h-100 text-gray-500 dark:text-gray-400 text-center">
              <svg class="w-16 h-16 stroke-2 opacity-50 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <p>Select a date to view or add tasks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

