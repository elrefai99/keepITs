<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from '../stores/store'
import { formatDate, getCurrentTimeString, getMinutesFromTime } from '../utils/dateUtils'
import { useRouter } from 'vue-router'

const store = useScheduleStore()
const router = useRouter()
const currentTime = ref(new Date())

const today = new Date()
today.setHours(0, 0, 0, 0)
const todayFormatted = computed(() => formatDate(today))

// Filter state
const activeFilter = ref<string | null>(null)

// Get today's tasks
const todayTasks = computed(() => {
  const dateKey = todayFormatted.value
  const tasks = store.getTasksSpanningDate(dateKey)
  return tasks.sort((a: any, b: any) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order
    return (a.time || '').localeCompare(b.time || '')
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

// Selected task
const selectedTaskId = ref<string | null>(null)
const selectedTask = computed(() => {
  if (!selectedTaskId.value) return null
  return todayTasks.value.find((t: any) => t.id === selectedTaskId.value) || null
})

const selectTask = (taskId: string) => {
  selectedTaskId.value = selectedTaskId.value === taskId ? null : taskId
}

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

    <!-- SELECTED TASK DETAIL panel -->
    <div v-if="selectedTask" class="border-t border-[#1a2820] bg-[#080d0a]">
      <div class="px-4 sm:px-6 py-4">
        <div class="flex items-start justify-between gap-4 mb-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <div :class="['w-2.5 h-2.5 rounded-full',
                getTaskStatus(selectedTask) === 'active' ? 'bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.4)]' :
                getTaskStatus(selectedTask) === 'waiting' ? 'bg-blue-400' :
                getTaskStatus(selectedTask) === 'prioritized' ? 'bg-amber-400' :
                'bg-[#4a6b58]']">
              </div>
              <span :class="['px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border',
                getTaskStatus(selectedTask) === 'active' ? 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20' :
                getTaskStatus(selectedTask) === 'waiting' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
                getTaskStatus(selectedTask) === 'prioritized' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                'bg-[#4a6b58]/10 text-[#4a6b58] border-[#4a6b58]/20']">
                {{ getStatusLabel(getTaskStatus(selectedTask)) }}
              </span>
              <span v-if="selectedTask.meetingUrl" class="px-2 py-0.5 rounded bg-blue-900/40 text-[9px] font-semibold text-blue-300 border border-blue-800/30">Meeting</span>
            </div>
            <h3 class="text-sm font-bold text-[#c8ddd5]">{{ selectedTask.title }}</h3>
          </div>
          <button @click="selectedTaskId = null" class="w-7 h-7 rounded-lg bg-[#111a14] border border-[#1a2820] text-[#3d5a4a] hover:text-white hover:border-[#2a4035] flex items-center justify-center transition-all flex-shrink-0">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-[#0a0f0b] border border-[#1a2820] rounded-lg p-3">
            <div class="text-[9px] text-[#2d4035] uppercase tracking-widest mb-1">Start</div>
            <div class="text-xs font-mono font-bold text-[#8fb89f]">{{ selectedTask.time || '--:--' }}</div>
          </div>
          <div class="bg-[#0a0f0b] border border-[#1a2820] rounded-lg p-3">
            <div class="text-[9px] text-[#2d4035] uppercase tracking-widest mb-1">End</div>
            <div class="text-xs font-mono font-bold text-[#8fb89f]">{{ selectedTask.endTime || '--:--' }}</div>
          </div>
          <div class="bg-[#0a0f0b] border border-[#1a2820] rounded-lg p-3">
            <div class="text-[9px] text-[#2d4035] uppercase tracking-widest mb-1">Progress</div>
            <div class="text-xs font-mono font-bold text-[#4ade80]">{{ getTaskProgress(selectedTask) }}%</div>
          </div>
          <div class="bg-[#0a0f0b] border border-[#1a2820] rounded-lg p-3">
            <div class="text-[9px] text-[#2d4035] uppercase tracking-widest mb-1">Duration</div>
            <div class="text-xs font-mono font-bold text-[#8fb89f]">{{ selectedTask.durationDays || 1 }}d</div>
          </div>
        </div>

        <div v-if="selectedTask.description" class="mt-3 bg-[#0a0f0b] border border-[#1a2820] rounded-lg p-3">
          <div class="text-[9px] text-[#2d4035] uppercase tracking-widest mb-2">Description</div>
          <div class="space-y-1">
            <div v-for="(line, i) in descLines(selectedTask.description)" :key="i" class="flex items-start gap-1.5 text-[11px] text-[#4a6b58]">
              <span class="text-[#2d4035] mt-0.5 flex-shrink-0">-</span>
              <span class="break-words">{{ line }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedTask.meetingUrl" class="mt-3">
          <a :href="selectedTask.meetingUrl" target="_blank" rel="noreferrer"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 text-xs font-semibold border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M5 5v14h14"/></svg>
            Join Meeting
          </a>
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
</style>
