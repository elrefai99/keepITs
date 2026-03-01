<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from '../stores/store'
import { formatDate, getCurrentTimeString, getMinutesFromTime, isDateDisabled } from '../utils/dateUtils'
import { useRouter } from 'vue-router'
import { useCalendar } from '../shared/useCalendar'
import { useTaskLogic } from '../shared/useTaskLogic'

const store = useScheduleStore()
const router = useRouter()
const currentTime = ref(new Date())

const today = new Date()
today.setHours(0, 0, 0, 0)
const todayFormatted = computed(() => formatDate(today))

// useCalendar just for selectedDate (we lock it to today)
const { selectedDate } = useCalendar()
selectedDate.value = today

// useTaskLogic wires up add/edit form
const {
  showAddForm, editingTaskId, newTask, endDatePreview,
  handleAddTask, handleEditTask, toggleComplete, deleteTaskItem,
  openGoogleCalendarForTask
} = useTaskLogic(store, selectedDate, todayFormatted, currentTime)

// Filter state
const activeFilter = ref<string | null>(null)

// Get today's tasks
const todayTasks = computed(() => {
  const dateKey = todayFormatted.value
  const tasks = store.getTasksSpanningDate(dateKey)
  // Sort AM → PM; tasks with no time go to end
  return tasks.sort((a: any, b: any) => {
    const ta = a.time || '99:99'
    const tb = b.time || '99:99'
    return ta.localeCompare(tb)
  })
})

// Get task status
const getTaskStatus = (task: any): string => {
  const dateKey = todayFormatted.value
  const currentTimeStr = getCurrentTimeString(currentTime.value)
  const currentMinutes = getMinutesFromTime(currentTimeStr)

  if (task.durationDays && task.durationDays > 1 && task.startDate !== dateKey) {
    return task.completed ? 'completed' : 'waiting'
  }

  const startMinutes = task.time ? getMinutesFromTime(task.time) : 0
  const endMinutes = task.endTime ? getMinutesFromTime(task.endTime) : startMinutes + 60

  if (task.completed) return 'completed'
  if (currentMinutes > endMinutes) return 'completed'
  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) return 'active'
  if (task.meetingUrl) return 'prioritized'
  return 'waiting'
}

// Get task progress percentage
const getTaskProgress = (task: any): number => {
  const currentTimeStr = getCurrentTimeString(currentTime.value)
  const currentMinutes = getMinutesFromTime(currentTimeStr)
  const status = getTaskStatus(task)

  if (status === 'completed') return 100

  const startMinutes = task.time ? getMinutesFromTime(task.time) : 0
  const endMinutes = task.endTime ? getMinutesFromTime(task.endTime) : startMinutes + 60
  const totalDuration = endMinutes - startMinutes

  if (totalDuration <= 0) return 0
  if (status === 'active') {
    const elapsed = currentMinutes - startMinutes
    return Math.min(Math.max(Math.round((elapsed / totalDuration) * 100), 5), 95)
  }
  return 0
}

// Categorize tasks
const categorized = computed(() => {
  const active: any[] = []
  const waiting: any[] = []
  const prioritized: any[] = []
  const completed: any[] = []

  todayTasks.value.forEach((task: any) => {
    const status = getTaskStatus(task)
    if (status === 'active') active.push(task)
    else if (status === 'waiting') waiting.push(task)
    else if (status === 'prioritized') prioritized.push(task)
    else if (status === 'completed') completed.push(task)
  })

  return { active, waiting, prioritized, completed }
})

const getCountForStatus = (statusId: string): number => {
  return (categorized.value as any)[statusId]?.length || 0
}

// Filtered tasks for the main grid
const filteredTasks = computed(() => {
  if (!activeFilter.value) return todayTasks.value
  return todayTasks.value.filter((task: any) => getTaskStatus(task) === activeFilter.value)
})

// Selected task (for the detail drawer)
const selectedTaskId = ref<string | null>(null)
const selectedTask = computed(() => {
  if (!selectedTaskId.value) return null
  return todayTasks.value.find((t: any) => t.id === selectedTaskId.value) || null
})

const selectTask = (taskId: string) => {
  selectedTaskId.value = selectedTaskId.value === taskId ? null : taskId
}

const closeDrawer = () => { selectedTaskId.value = null }

const toggleFilter = (statusId: string) => {
  activeFilter.value = activeFilter.value === statusId ? null : statusId
}

const completionRate = computed(() => {
  const total = todayTasks.value.length
  if (total === 0) return 0
  return Math.round((categorized.value.completed.length / total) * 100)
})

// Greeting
const greeting = computed(() => {
  const hour = currentTime.value.getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
})

const currentTimeFormatted = computed(() => {
  const h = String(currentTime.value.getHours()).padStart(2, '0')
  const m = String(currentTime.value.getMinutes()).padStart(2, '0')
  const s = String(currentTime.value.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
})

const monthDay = computed(() => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}`
})

const descLines = (desc: string): string[] =>
  desc ? desc.split('\n').map(l => l.trim()).filter(l => l.length > 0) : []

// Bar width for status columns
const getBarWidth = (statusId: string): string => {
  const total = todayTasks.value.length
  if (total === 0) return '0%'
  const count = getCountForStatus(statusId)
  return `${Math.max((count / total) * 100, count > 0 ? 8 : 0)}%`
}

// Status label
const getStatusLabel = (status: string): string => {
  if (status === 'active') return 'Active'
  if (status === 'waiting') return 'Waiting'
  if (status === 'prioritized') return 'Priority'
  return 'Done'
}

// Open edit form for a task (from the drawer)
const openEditFromDrawer = (task: any) => {
  handleEditTask(task, todayFormatted.value)
  closeDrawer()
}

// Delete task from drawer
const deleteFromDrawer = (taskId: string) => {
  if (!confirm('Delete this task?')) return
  deleteTaskItem(taskId)
  closeDrawer()
}

// Toggle complete from drawer
const toggleFromDrawer = (taskId: string) => {
  toggleComplete(taskId)
  // keep drawer open — selectedTask will reactively update
}

onMounted(async () => {
  if (!store.synced) await store.loadUserTasks()
  setInterval(() => { currentTime.value = new Date() }, 1000)
})
</script>

<template>
  <div class="dashboard-root">

    <!-- Dashboard Layout: Sidebar + Main -->
    <div class="flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-220px)]">

      <!-- LEFT SIDEBAR: Task list -->
      <div class="lg:w-64 xl:w-72 flex-shrink-0 bg-[#080d0a] lg:border-r border-b lg:border-b-0 border-[#1a2820] overflow-hidden flex flex-col">

        <!-- Sidebar Header -->
        <div class="px-4 py-3 border-b border-[#131e17] flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span class="text-xs font-bold text-[#8fb89f] uppercase tracking-widest">Today's Tasks</span>
          </div>
          <span class="min-w-[1.5rem] h-5 px-1.5 rounded-md bg-[#132218] border border-[#1f3228] text-[10px] font-bold text-[#4a6b58] flex items-center justify-center">{{ todayTasks.length }}</span>
        </div>

        <!-- Filter chips -->
        <div class="px-3 py-2 border-b border-[#131e17] flex gap-1.5 overflow-x-auto" style="scrollbar-width:none">
          <button
            @click="activeFilter = null"
            :class="['px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border',
              !activeFilter
                ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/25'
                : 'bg-transparent text-[#3d5a4a] border-[#1a2820] hover:border-[#2a4035] hover:text-[#8fb89f]']"
          >All {{ todayTasks.length }}</button>

          <!-- Active filter -->
          <button @click="toggleFilter('active')"
            :class="['px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-1',
              activeFilter === 'active'
                ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/25'
                : 'bg-transparent text-[#3d5a4a] border-[#1a2820] hover:border-[#2a4035] hover:text-[#8fb89f]']">
            <span class="w-1.5 h-1.5 rounded-full bg-[#4ade80] flex-shrink-0"></span>
            {{ getCountForStatus('active') }}
          </button>

          <!-- Waiting filter -->
          <button @click="toggleFilter('waiting')"
            :class="['px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-1',
              activeFilter === 'waiting'
                ? 'bg-blue-400/10 text-blue-400 border-blue-400/25'
                : 'bg-transparent text-[#3d5a4a] border-[#1a2820] hover:border-[#2a4035] hover:text-[#8fb89f]']">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
            {{ getCountForStatus('waiting') }}
          </button>

          <!-- Prioritized filter -->
          <button @click="toggleFilter('prioritized')"
            :class="['px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-1',
              activeFilter === 'prioritized'
                ? 'bg-amber-400/10 text-amber-400 border-amber-400/25'
                : 'bg-transparent text-[#3d5a4a] border-[#1a2820] hover:border-[#2a4035] hover:text-[#8fb89f]']">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
            {{ getCountForStatus('prioritized') }}
          </button>

          <!-- Completed filter -->
          <button @click="toggleFilter('completed')"
            :class="['px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-1',
              activeFilter === 'completed'
                ? 'bg-[#4a6b58]/15 text-[#4a6b58] border-[#4a6b58]/25'
                : 'bg-transparent text-[#3d5a4a] border-[#1a2820] hover:border-[#2a4035] hover:text-[#8fb89f]']">
            <span class="w-1.5 h-1.5 rounded-full bg-[#4a6b58] flex-shrink-0"></span>
            {{ getCountForStatus('completed') }}
          </button>
        </div>

        <!-- Task list -->
        <div class="flex-1 overflow-y-auto" style="scrollbar-width:thin;scrollbar-color:#1a2820 transparent">
          <div v-if="filteredTasks.length === 0" class="flex flex-col items-center justify-center py-12 text-[#2d4035]">
            <svg class="w-8 h-8 opacity-30 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
            <p class="text-[10px]">No tasks found</p>
          </div>
          <button
            v-for="task in filteredTasks"
            :key="task.id"
            @click="selectTask(task.id)"
            :class="['w-full text-left px-4 py-2.5 border-b border-[#111a14] transition-all flex items-center gap-2.5 group',
              selectedTaskId === task.id
                ? 'bg-[#4ade80]/[0.06] border-l-2 border-l-[#4ade80]'
                : 'hover:bg-[#0d1410] border-l-2 border-l-transparent']"
          >
            <!-- Status dot -->
            <div :class="['w-2 h-2 rounded-full flex-shrink-0',
              getTaskStatus(task) === 'active' ? 'bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.4)]' :
              getTaskStatus(task) === 'waiting' ? 'bg-blue-400' :
              getTaskStatus(task) === 'prioritized' ? 'bg-amber-400' :
              'bg-[#4a6b58]']">
            </div>
            <!-- Task name -->
            <div class="flex-1 min-w-0">
              <div :class="['text-xs font-medium truncate leading-snug',
                getTaskStatus(task) === 'completed' ? 'text-[#3d5a4a] line-through' :
                selectedTaskId === task.id ? 'text-[#c8ddd5]' : 'text-[#8fb89f] group-hover:text-[#c8ddd5]']">
                {{ task.title }}
              </div>
              <div v-if="task.time" class="text-[9px] font-mono text-[#2d4035] mt-0.5">{{ task.time }}{{ task.endTime ? ` - ${task.endTime}` : '' }}</div>
            </div>
          </button>
        </div>

        <!-- Sidebar footer: quick actions -->
        <div class="px-3 py-2.5 border-t border-[#131e17] flex gap-2">
          <button @click="router.push('/board')" class="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-[#1a2820] text-[#4a6b58] text-[10px] font-semibold hover:border-[#4ade80]/30 hover:text-[#4ade80] transition-all">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
            Board
          </button>
          <button @click="router.push('/calendar')" class="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-[#1a2820] text-[#4a6b58] text-[10px] font-semibold hover:border-blue-400/30 hover:text-blue-400 transition-all">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Calendar
          </button>
        </div>
      </div>

      <!-- MAIN CONTENT: Status dashboard grid -->
      <div class="flex-1 flex flex-col min-w-0 bg-[#070c09]">

        <!-- Top bar: Greeting, status filters, time -->
        <div class="px-4 sm:px-6 py-3 border-b border-[#1a2820] bg-[#080d0a] flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 class="text-base sm:text-lg font-bold text-white tracking-tight">{{ greeting }}</h1>
            <p class="text-[10px] text-[#4a6b58] font-mono mt-0.5">{{ monthDay }} {{ todayFormatted }}</p>
          </div>
          <div class="flex items-center gap-4">
            <!-- Status pills (desktop) -->
            <div class="hidden md:flex items-center gap-2">
              <button @click="toggleFilter('active')"
                :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border',
                  activeFilter === 'active' ? 'text-[#4ade80] border-[#4ade80]/25 bg-[#4ade80]/8' : 'text-[#4a6b58] border-[#1a2820] hover:border-[#2a4035]']">
                <span class="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>ACTIVE <span class="font-mono ml-0.5">{{ getCountForStatus('active') }}</span>
              </button>
              <button @click="toggleFilter('waiting')"
                :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border',
                  activeFilter === 'waiting' ? 'text-blue-400 border-blue-400/25 bg-blue-400/8' : 'text-[#4a6b58] border-[#1a2820] hover:border-[#2a4035]']">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>WAITING <span class="font-mono ml-0.5">{{ getCountForStatus('waiting') }}</span>
              </button>
              <button @click="toggleFilter('prioritized')"
                :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border',
                  activeFilter === 'prioritized' ? 'text-amber-400 border-amber-400/25 bg-amber-400/8' : 'text-[#4a6b58] border-[#1a2820] hover:border-[#2a4035]']">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>PRIORITIZED <span class="font-mono ml-0.5">{{ getCountForStatus('prioritized') }}</span>
              </button>
              <button @click="toggleFilter('completed')"
                :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border',
                  activeFilter === 'completed' ? 'text-[#4a6b58] border-[#4a6b58]/25 bg-[#4a6b58]/8' : 'text-[#4a6b58] border-[#1a2820] hover:border-[#2a4035]']">
                <span class="w-1.5 h-1.5 rounded-full bg-[#4a6b58]"></span>COMPLETED <span class="font-mono ml-0.5">{{ getCountForStatus('completed') }}</span>
              </button>
            </div>
            <div class="text-right">
              <div class="text-sm sm:text-base font-bold font-mono text-white tracking-wider">{{ currentTimeFormatted }}</div>
            </div>
          </div>
        </div>

        <!-- Status distribution bar -->
        <div class="px-4 sm:px-6 py-2 border-b border-[#131e17] bg-[#080d0a]">
          <div class="flex h-1.5 rounded-full overflow-hidden bg-[#111a14] gap-px">
            <div class="h-full bg-[#4ade80] transition-all duration-700 first:rounded-l-full" :style="{ width: getBarWidth('active') }"></div>
            <div class="h-full bg-blue-400 transition-all duration-700" :style="{ width: getBarWidth('waiting') }"></div>
            <div class="h-full bg-amber-400 transition-all duration-700" :style="{ width: getBarWidth('prioritized') }"></div>
            <div class="h-full bg-[#4a6b58] transition-all duration-700 last:rounded-r-full" :style="{ width: getBarWidth('completed') }"></div>
          </div>
          <div class="flex items-center justify-between mt-1.5">
            <span class="text-[9px] text-[#2d4035] font-mono">{{ todayTasks.length }} total</span>
            <span class="text-[9px] text-[#2d4035] font-mono">{{ completionRate }}% done</span>
          </div>
        </div>

        <!-- Main grid: task rows with status bars -->
        <div class="flex-1 overflow-y-auto" style="scrollbar-width:thin;scrollbar-color:#1a2820 transparent">

          <!-- Table header -->
          <div class="sticky top-0 z-10 bg-[#080d0a]/95 backdrop-blur-sm border-b border-[#1a2820]">
            <div class="dashboard-grid items-center px-4 sm:px-6 py-2">
              <div class="text-[9px] font-bold text-[#3d5a4a] uppercase tracking-widest">Task</div>
              <div class="text-[9px] font-bold text-[#3d5a4a] uppercase tracking-widest text-center hidden sm:block">Time</div>
              <div class="text-[9px] font-bold text-[#3d5a4a] uppercase tracking-widest text-center">Status</div>
              <div class="text-[9px] font-bold text-[#3d5a4a] uppercase tracking-widest">Progress</div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="filteredTasks.length === 0" class="flex flex-col items-center justify-center py-20 text-[#2d4035]">
            <svg class="w-14 h-14 opacity-20 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <p class="text-sm font-medium mb-1">No tasks scheduled</p>
            <p class="text-[10px] text-[#1e3025] mb-4">Add tasks from the Board page</p>
            <button @click="router.push('/board')" class="px-4 py-2 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/20 text-[#4ade80] text-xs font-semibold hover:bg-[#4ade80]/15 transition-all">
              Open Board
            </button>
          </div>

          <!-- Task rows -->
          <div v-else>
            <div
              v-for="(task, idx) in filteredTasks"
              :key="task.id"
              @click="selectTask(task.id)"
              :class="['dashboard-grid items-center px-4 sm:px-6 py-3 border-b border-[#111a14] cursor-pointer transition-all group',
                selectedTaskId === task.id ? 'bg-[#4ade80]/[0.04]' :
                idx % 2 === 0 ? 'bg-[#070c09]' : 'bg-[#080e0a]',
                'hover:bg-[#0d1410]']"
            >
              <!-- Task name -->
              <div class="flex items-center gap-2.5 min-w-0 pr-3">
                <div :class="['w-2 h-2 rounded-full flex-shrink-0 transition-all',
                  getTaskStatus(task) === 'active' ? 'bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.4)]' :
                  getTaskStatus(task) === 'waiting' ? 'bg-blue-400' :
                  getTaskStatus(task) === 'prioritized' ? 'bg-amber-400' :
                  'bg-[#4a6b58]']">
                </div>
                <div class="min-w-0">
                  <div :class="['text-xs font-semibold truncate leading-snug',
                    getTaskStatus(task) === 'completed' ? 'text-[#3d5a4a] line-through' : 'text-[#c8ddd5]']">
                    {{ task.title }}
                  </div>
                  <div v-if="task.description" class="text-[9px] text-[#2d4035] truncate mt-0.5 max-w-[200px]">{{ task.description.split('\n')[0] }}</div>
                </div>
              </div>

              <!-- Time -->
              <div class="text-center hidden sm:block">
                <span v-if="task.time" class="text-[10px] font-mono text-[#4a6b58]">{{ task.time }}</span>
                <span v-else class="text-[10px] text-[#1e3025]">--:--</span>
              </div>

              <!-- Status badge -->
              <div class="flex justify-center">
                <span :class="['px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border',
                  getTaskStatus(task) === 'active' ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20' :
                  getTaskStatus(task) === 'waiting' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
                  getTaskStatus(task) === 'prioritized' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                  'bg-[#4a6b58]/10 text-[#4a6b58] border-[#4a6b58]/20']">
                  {{ getStatusLabel(getTaskStatus(task)) }}
                </span>
              </div>

              <!-- Progress bar -->
              <div class="flex items-center gap-3 pl-2">
                <div class="flex-1 h-2 bg-[#111a14] rounded-full overflow-hidden">
                  <div
                    :class="['h-full rounded-full transition-all duration-700',
                      getTaskStatus(task) === 'active' ? 'bg-[#4ade80]' :
                      getTaskStatus(task) === 'waiting' ? 'bg-blue-400/60' :
                      getTaskStatus(task) === 'prioritized' ? 'bg-amber-400/70' :
                      'bg-[#4a6b58]']"
                    :style="{ width: `${getTaskProgress(task)}%` }">
                  </div>
                </div>
                <span class="text-[10px] font-mono text-[#3d5a4a] w-8 text-right flex-shrink-0">{{ getTaskProgress(task) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom summary bar -->
        <div class="px-4 sm:px-6 py-3 border-t border-[#1a2820] bg-[#080d0a] flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-[#4ade80]"></span>
              <span class="text-[10px] text-[#3d5a4a] font-medium">ACTIVE</span>
              <span class="text-[10px] font-mono font-bold text-[#4a6b58]">{{ getCountForStatus('active') }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-blue-400"></span>
              <span class="text-[10px] text-[#3d5a4a] font-medium">WAITING</span>
              <span class="text-[10px] font-mono font-bold text-[#4a6b58]">{{ getCountForStatus('waiting') }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              <span class="text-[10px] text-[#3d5a4a] font-medium">PRIORITIZED</span>
              <span class="text-[10px] font-mono font-bold text-[#4a6b58]">{{ getCountForStatus('prioritized') }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-[#4a6b58]"></span>
              <span class="text-[10px] text-[#3d5a4a] font-medium">COMPLETED</span>
              <span class="text-[10px] font-mono font-bold text-[#4a6b58]">{{ getCountForStatus('completed') }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-[#3d5a4a]">Completion</span>
            <div class="w-20 h-1.5 bg-[#111a14] rounded-full overflow-hidden">
              <div class="h-full bg-[#4ade80] rounded-full transition-all duration-700" :style="{ width: `${completionRate}%` }"></div>
            </div>
            <span class="text-[10px] font-mono font-bold text-[#4ade80]">{{ completionRate }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ======= TASK DETAIL DRAWER (slide-in from right) ======= -->
    <transition name="drawer">
    <div
      v-if="selectedTask"
      class="fixed inset-0 z-50 flex justify-end"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeDrawer" />

      <!-- Drawer panel -->
      <div class="relative w-full max-w-sm sm:max-w-md h-full bg-[#0b1410] border-l border-[#1f3228] flex flex-col shadow-2xl shadow-black overflow-hidden">

        <!-- Header -->
        <div class="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[#1f3228] bg-[#0d1a11]/80 backdrop-blur-sm flex-shrink-0">
          <div class="flex-1 min-w-0 pr-3">
            <!-- Status badge -->
            <div class="flex items-center gap-2 mb-2">
              <div :class="['w-2 h-2 rounded-full flex-shrink-0',
                getTaskStatus(selectedTask) === 'active' ? 'bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.5)] animate-pulse' :
                getTaskStatus(selectedTask) === 'waiting' ? 'bg-blue-400' :
                getTaskStatus(selectedTask) === 'prioritized' ? 'bg-amber-400' :
                'bg-[#4a6b58]']"
              />
              <span :class="['px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border',
                getTaskStatus(selectedTask) === 'active' ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20' :
                getTaskStatus(selectedTask) === 'waiting' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
                getTaskStatus(selectedTask) === 'prioritized' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                'bg-[#4a6b58]/10 text-[#4a6b58] border-[#4a6b58]/20']"
              >{{ getStatusLabel(getTaskStatus(selectedTask)) }}</span>
              <span v-if="selectedTask.durationDays > 1" class="px-2 py-0.5 rounded bg-[#4ade80]/10 text-[9px] font-bold text-[#4ade80] border border-[#4ade80]/20">
                {{ selectedTask.durationDays }}d task
              </span>
              <span v-if="selectedTask.meetingUrl" class="px-2 py-0.5 rounded bg-blue-900/40 text-[9px] font-semibold text-blue-300 border border-blue-800/30">Meeting</span>
            </div>
            <!-- Title -->
            <h2 :class="['text-base font-bold leading-snug break-words',
              selectedTask.completed ? 'text-[#4a6b58] line-through' : 'text-[#e8f5ee]']"
            >{{ selectedTask.title }}</h2>
          </div>
          <button @click="closeDrawer"
            class="w-8 h-8 rounded-xl bg-[#132218] border border-[#1f3228] text-[#4a6b58] hover:text-white hover:border-[#2a4035] flex items-center justify-center transition-all flex-shrink-0 mt-0.5"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4" style="scrollbar-width:thin;scrollbar-color:#1a2820 transparent">

          <!-- Time & Progress cards -->
          <div class="grid grid-cols-2 gap-2.5">
            <div class="bg-[#0a0f0b] border border-[#1a2820] rounded-xl p-3">
              <div class="text-[9px] text-[#2d4035] uppercase tracking-widest mb-1.5 font-semibold">Start Time</div>
              <div class="text-sm font-black font-mono text-[#4ade80]">{{ selectedTask.time || '—' }}</div>
            </div>
            <div class="bg-[#0a0f0b] border border-[#1a2820] rounded-xl p-3">
              <div class="text-[9px] text-[#2d4035] uppercase tracking-widest mb-1.5 font-semibold">End Time</div>
              <div class="text-sm font-black font-mono text-[#8fb89f]">{{ selectedTask.endTime || '—' }}</div>
            </div>
            <div class="bg-[#0a0f0b] border border-[#1a2820] rounded-xl p-3">
              <div class="text-[9px] text-[#2d4035] uppercase tracking-widest mb-1.5 font-semibold">Duration</div>
              <div class="text-sm font-black font-mono text-[#8fb89f]">{{ selectedTask.durationDays || 1 }} day{{ (selectedTask.durationDays || 1) > 1 ? 's' : '' }}</div>
            </div>
            <div class="bg-[#0a0f0b] border border-[#1a2820] rounded-xl p-3">
              <div class="text-[9px] text-[#2d4035] uppercase tracking-widest mb-1.5 font-semibold">Progress</div>
              <div class="text-sm font-black font-mono text-[#4ade80]">{{ getTaskProgress(selectedTask) }}%</div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="bg-[#0a0f0b] border border-[#1a2820] rounded-xl p-3">
            <div class="flex justify-between text-[9px] text-[#2d4035] mb-2">
              <span class="uppercase tracking-widest font-semibold">Task progress</span>
              <span class="font-mono">{{ getTaskProgress(selectedTask) }}%</span>
            </div>
            <div class="h-2 bg-[#111a14] rounded-full overflow-hidden">
              <div
                :class="['h-full rounded-full transition-all duration-700',
                  getTaskStatus(selectedTask) === 'active' ? 'bg-[#4ade80]' :
                  getTaskStatus(selectedTask) === 'completed' ? 'bg-[#4a6b58]' :
                  getTaskStatus(selectedTask) === 'waiting' ? 'bg-blue-400/60' :
                  'bg-amber-400/70']"
                :style="{ width: `${getTaskProgress(selectedTask)}%` }"
              />
            </div>
          </div>

          <!-- Multi-day span -->
          <div v-if="selectedTask.durationDays > 1" class="bg-[#4ade80]/5 border border-[#4ade80]/15 rounded-xl p-3">
            <div class="text-[9px] text-[#3d5a4a] uppercase tracking-widest mb-1.5 font-semibold">Date Span</div>
            <div class="text-xs font-mono text-[#8fb89f] flex items-center gap-2">
              <span>{{ selectedTask.startDate }}</span>
              <svg class="w-3 h-3 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span>{{ selectedTask.endDate || selectedTask.startDate }}</span>
            </div>
          </div>

          <!-- Description -->
          <div v-if="selectedTask.description" class="bg-[#0a0f0b] border border-[#1a2820] rounded-xl p-3">
            <div class="text-[9px] text-[#2d4035] uppercase tracking-widest mb-2.5 font-semibold">Description</div>
            <div class="space-y-1.5">
              <div
                v-for="(line, i) in descLines(selectedTask.description)"
                :key="i"
                class="flex items-start gap-2 text-xs text-[#8fb89f] leading-relaxed"
              >
                <span class="text-[#4ade80] mt-0.5 flex-shrink-0 font-bold">›</span>
                <span class="break-words">{{ line }}</span>
              </div>
            </div>
          </div>

          <!-- Meeting -->
          <div v-if="selectedTask.meetingUrl" class="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3">
            <div class="text-[9px] text-blue-400/70 uppercase tracking-widest mb-2.5 font-semibold">Meeting</div>
            <div v-if="selectedTask.guestEmails?.length" class="text-[10px] text-blue-300/70 mb-2">
              Guests: {{ selectedTask.guestEmails.join(', ') }}
            </div>
            <a
              :href="selectedTask.meetingUrl" target="_blank" rel="noreferrer"
              class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/15 text-blue-300 text-xs font-bold border border-blue-500/25 hover:bg-blue-500/25 transition-colors w-full justify-center"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M5 5v14h14"/></svg>
              Join Meeting
            </a>
          </div>

          <!-- Completed notice -->
          <div v-if="selectedTask.completed" class="flex items-center gap-2 p-3 bg-[#4a6b58]/10 border border-[#4a6b58]/20 rounded-xl">
            <svg class="w-4 h-4 text-[#4a6b58] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span class="text-xs text-[#4a6b58] font-semibold">Task completed</span>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="flex-shrink-0 px-5 py-4 border-t border-[#1f3228] bg-[#0d1a11]/60 backdrop-blur-sm space-y-2">
          <!-- Edit -->
          <button
            @click="openEditFromDrawer(selectedTask)"
            class="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-[#4ade80] text-[#070c09] hover:bg-[#22c55e] active:scale-[0.98] transition-all shadow-lg shadow-[#4ade80]/15"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Task
          </button>
          <div class="flex gap-2">
            <!-- Toggle complete -->
            <button
              @click="toggleFromDrawer(selectedTask.id)"
              :class="['flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs border transition-all active:scale-[0.98]',
                selectedTask.completed
                  ? 'bg-[#4a6b58]/10 border-[#4a6b58]/25 text-[#4a6b58] hover:bg-[#4a6b58]/20'
                  : 'bg-[#4ade80]/8 border-[#4ade80]/20 text-[#4ade80]/80 hover:bg-[#4ade80]/15']"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {{ selectedTask.completed ? 'Mark Undone' : 'Mark Done' }}
            </button>
            <!-- Delete -->
            <button
              @click="deleteFromDrawer(selectedTask.id)"
              class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs border border-red-800/30 text-red-400/70 bg-red-950/20 hover:bg-red-950/40 hover:text-red-300 active:scale-[0.98] transition-all"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
    </transition>

  </div>

  <!-- ======= EDIT TASK MODAL ======= -->
  <div
    v-if="showAddForm && selectedDate && !isDateDisabled(selectedDate)"
    class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-3 sm:p-4"
    @click.self="() => { showAddForm = false; editingTaskId = null; }"
  >
    <div class="bg-[#0d1a11]/80 backdrop-blur-md border border-[#1f3228] rounded-2xl shadow-2xl shadow-black/80 w-full max-w-lg max-h-[95vh] overflow-y-auto">

      <div class="sticky top-0 z-10 bg-[#0d1a11]/95 backdrop-blur-sm border-b border-[#1f3228] px-5 pt-4 pb-3.5 flex items-start justify-between rounded-t-2xl">
        <div>
          <h3 class="text-base font-bold text-[#c8ddd5] leading-tight">{{ editingTaskId ? 'Edit Task' : 'New Task' }}</h3>
          <p class="text-[10px] text-[#3d5a4a] mt-0.5 font-mono">{{ todayFormatted }}</p>
        </div>
        <button @click="() => { showAddForm = false; editingTaskId = null; }"
          class="w-8 h-8 flex items-center justify-center rounded-xl bg-[#132218] border border-[#1f3228] text-[#4a6b58] hover:text-white hover:border-[#2a4035] active:scale-95 transition-all mt-0.5">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="p-5 flex flex-col gap-3.5">
        <input v-model="newTask.title" type="text" placeholder="Task title *"
          class="w-full p-3.5 bg-[#0a0f0b] border border-[#1f3228] text-[#c8ddd5] rounded-xl text-sm outline-none focus:border-[#4ade80]/50 focus:ring-2 focus:ring-[#4ade80]/10 placeholder-[#2d4035] transition-all font-medium" />

        <!-- Duration -->
        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17]"><span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Duration (days)</span></div>
          <div class="px-3.5 py-3">
            <div class="flex items-center gap-3">
              <button type="button" @click="newTask.durationDays = Math.max(1,(newTask.durationDays||1)-1)" class="w-8 h-8 rounded-lg bg-[#132218] border border-[#2a4035] text-[#4ade80] text-lg font-bold flex items-center justify-center hover:bg-[#1a3020] active:scale-90 transition-all leading-none">-</button>
              <input v-model.number="newTask.durationDays" type="number" min="1" max="365" class="w-14 text-center p-2 bg-[#0d1410] border border-[#1f3228] text-[#c8ddd5] rounded-lg text-sm font-bold outline-none focus:border-[#4ade80]/40" />
              <button type="button" @click="newTask.durationDays = (newTask.durationDays||1)+1" class="w-8 h-8 rounded-lg bg-[#132218] border border-[#2a4035] text-[#4ade80] text-lg font-bold flex items-center justify-center hover:bg-[#1a3020] active:scale-90 transition-all leading-none">+</button>
              <span class="text-xs text-[#3d5a4a]">{{ newTask.durationDays === 1 ? 'single day' : 'days' }}</span>
            </div>
            <div v-if="endDatePreview" class="mt-2.5 flex items-center gap-2 text-[10px]">
              <span class="text-[#4a6b58] font-mono">{{ todayFormatted }}</span>
              <svg class="w-3 h-3 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span class="text-[#8fb89f] font-mono">{{ endDatePreview }}</span>
              <span class="ml-auto bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/20 px-1.5 py-0.5 rounded text-[10px] font-bold">{{ newTask.durationDays }}d</span>
            </div>
          </div>
        </div>

        <!-- Time -->
        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17] flex items-center justify-between">
            <span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Time Range</span>
            <span v-if="newTask.durationDays > 1" class="text-[9px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium">Only for today</span>
          </div>
          <div class="px-3.5 py-3 flex items-end gap-3">
            <div class="flex-1">
              <div class="text-[9px] text-[#2d4035] mb-1.5 uppercase tracking-widest font-semibold">Start</div>
              <input v-model="newTask.time" type="time" class="w-full p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#c8ddd5] rounded-lg text-sm outline-none focus:border-[#4ade80]/40 transition-all" />
            </div>
            <div class="pb-2.5 flex-shrink-0"><svg class="w-4 h-4 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="flex-1">
              <div class="text-[9px] text-[#2d4035] mb-1.5 uppercase tracking-widest font-semibold">End</div>
              <input v-model="newTask.endTime" type="time" class="w-full p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#c8ddd5] rounded-lg text-sm outline-none focus:border-[#4ade80]/40 transition-all" />
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17] flex items-center justify-between">
            <span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Description</span>
            <span class="text-[9px] text-[#2d4035]">each line = bullet</span>
          </div>
          <textarea v-model="newTask.description" placeholder="Enter each point on a new line" rows="3"
            class="w-full p-3.5 bg-transparent text-[#c8ddd5] text-sm resize-none outline-none placeholder-[#2d4035] font-mono leading-relaxed" />
        </div>

        <!-- Meeting -->
        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17]"><span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Meeting</span></div>
          <div class="px-3.5 py-3 flex flex-col gap-2.5">
            <select v-model="newTask.meetingType" class="w-full p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#8fb89f] rounded-lg text-sm outline-none focus:border-[#4ade80]/40 transition-all cursor-pointer appearance-none">
              <option value="none">No meeting</option>
              <option value="google">Google Meet</option>
              <option value="teams">Microsoft Teams</option>
              <option value="custom">Other link</option>
            </select>
            <template v-if="newTask.meetingType !== 'none'">
              <input v-model="newTask.meetingUrl" type="url" placeholder="Paste meeting link" class="w-full p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#8fb89f] rounded-lg text-xs outline-none focus:border-[#4ade80]/40 placeholder-[#2d4035] transition-all" />
              <div class="flex gap-2">
                <input v-model="newTask.guestEmailsText" type="text" placeholder="Guest emails, comma separated" class="flex-1 p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#8fb89f] rounded-lg text-xs outline-none focus:border-[#4ade80]/40 placeholder-[#2d4035] transition-all" />
                <button type="button" @click="openGoogleCalendarForTask" class="px-3 py-2 rounded-lg bg-[#132218] border border-[#2a4035] text-[#4ade80] text-xs font-semibold hover:bg-[#1a3020] active:scale-95 transition-all whitespace-nowrap">GCal</button>
              </div>
            </template>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2.5 pt-0.5">
          <button @click="handleAddTask" class="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[#4ade80] text-[#070c09] hover:bg-[#22c55e] active:scale-[0.98] transition-all shadow-lg shadow-[#4ade80]/20 flex items-center justify-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline v-if="editingTaskId" points="20 6 9 17 4 12"/>
              <template v-else><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></template>
            </svg>
            {{ editingTaskId ? 'Update Task' : 'Add Task' }}
          </button>
          <button @click="() => { showAddForm = false; editingTaskId = null; }" class="flex-1 py-3.5 rounded-xl font-semibold text-sm bg-[#0a0f0b] border border-[#1f3228] text-[#4a6b58] hover:border-[#2a4035] hover:text-[#8fb89f] active:scale-[0.98] transition-all">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-root {
  margin: -1rem -0.75rem -1.5rem;
}
@media (min-width: 640px) {
  .dashboard-root {
    margin: -1.5rem -1rem -1.5rem;
  }
}

/* Dashboard grid layout - Task | Time | Status | Progress */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 5rem 6rem 1fr;
  gap: 0.5rem;
}
@media (max-width: 639px) {
  .dashboard-grid {
    grid-template-columns: 1fr 5rem 1fr;
  }
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-enter-active .relative,
.drawer-leave-active .relative {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .relative,
.drawer-leave-to .relative {
  transform: translateX(100%);
}
</style>
