<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from '../stores/store'
import { formatDate, formatHour, isDateDisabled, weekDays } from '../utils/dateUtils'
import { getHourSlotHeight, getTaskPosition } from '../utils/calendarUtils'
import { useCalendar } from '../shared/useCalendar'
import { useTaskLogic } from '../shared/useTaskLogic'
import { useRouter } from 'vue-router'

const store = useScheduleStore()
const router = useRouter()
const currentTime = ref(new Date())

const {
  todayFormatted, selectedDate, calendarView,
  weekCalendarDays, displayedCalendarDays, calendarTitle,
  changeMonth, handleDateClick: calendarHandleDateClick, timeSlots
} = useCalendar()

const {
  showAddForm, editingTaskId, newTask, endDatePreview,
  currentTasks, handleAddTask, handleEditTask,
  toggleComplete, deleteTaskItem, openGoogleCalendarForTask,
  checkAndCompletePassedTasks
} = useTaskLogic(store, selectedDate, todayFormatted, currentTime)

// Calendar popup for week/day navigation
const showCalendarPopup = ref(false)
const popupDate = ref(new Date())
const monthNames2 = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const popupCalendarDays = computed(() => {
  const year = popupDate.value.getFullYear()
  const month = popupDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (Date | null)[] = []
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
  return days
})
const popupMonthTitle = computed(() => `${monthNames2[popupDate.value.getMonth()]} ${popupDate.value.getFullYear()}`)
const changePopupMonth = (d: number) => { popupDate.value = new Date(popupDate.value.getFullYear(), popupDate.value.getMonth() + d, 1) }
const selectPopupDate = (date: Date) => { calendarHandleDateClick(date); showAddForm.value = false; showCalendarPopup.value = false }

const handleDateClick = (date: Date) => { calendarHandleDateClick(date); showAddForm.value = false }

const getCurrentTimePosition = () => {
  const hour = currentTime.value.getHours()
  const minute = currentTime.value.getMinutes()
  const startHour = 6
  if (hour < startHour || hour > 23) return null
  const hourSlotHeight = getHourSlotHeight()
  const top = ((hour - startHour) * hourSlotHeight) + (minute * (hourSlotHeight / 60))
  return { top, display: true }
}

const getAllTasksForDay = (date: Date) => {
  const dateKey = formatDate(date)
  return store.getTasksSpanningDate(dateKey).sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''))
}

const getMultiDayLabel = (task: any, dateKey: string): string => {
  if (!task.durationDays || task.durationDays <= 1) return ''
  const start = new Date(task.startDate + 'T00:00:00')
  const cur = new Date(dateKey + 'T00:00:00')
  const diff = Math.round((cur.getTime() - start.getTime()) / 86400000) + 1
  return `Day ${diff}/${task.durationDays}`
}

const getTaskCountForDate = (date: Date) => store.getTasksSpanningDate(formatDate(date)).length
const getMeetingCountForDate = (date: Date) => store.getTasksForDate(formatDate(date)).filter((t: any) => t.meetingUrl).length

const navigateToBoard = (date: Date) => {
  router.push('/board')
}

onMounted(async () => {
  if (!store.synced) await store.loadUserTasks()
  setInterval(() => { currentTime.value = new Date(); checkAndCompletePassedTasks() }, 1000)
})
</script>

<template>
  <div class="space-y-4 sm:space-y-6">

    <!-- Page Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <svg class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-white">Calendar</h1>
          <p class="text-[10px] text-[#4a6b58] font-mono">{{ todayFormatted }}</p>
        </div>
      </div>
    </div>

    <!-- Calendar Widget -->
    <div class="bg-[#0d1410] border border-[#1a2820] rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4">

      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 sm:mb-4">
        <div class="flex gap-1 w-full sm:w-auto">
          <button v-for="view in (['day','week','month'] as const)" :key="view" @click="calendarView = view"
            :class="['flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border transition-all capitalize',
              calendarView === view ? 'bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/30' : 'bg-transparent text-[#4a6b58] border-[#1a2820] hover:border-[#2a4035] hover:text-[#8fb89f]']">{{ view }}</button>
        </div>
        <div class="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-start">
          <button @click="changeMonth(-1)" class="p-2 rounded-lg bg-[#111a14] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#2a4035] transition-all active:scale-95">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 @click="calendarView !== 'month' && (showCalendarPopup = !showCalendarPopup)"
            class="text-sm sm:text-base font-bold text-[#c8ddd5] text-center flex-1 sm:flex-none px-2 cursor-pointer hover:text-[#4ade80] transition-colors">
            {{ calendarTitle }}
            <span v-if="calendarView !== 'month'" class="ml-1 text-[10px] text-[#4a6b58] font-normal">(click to navigate)</span>
          </h2>
          <button @click="changeMonth(1)" class="p-2 rounded-lg bg-[#111a14] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#2a4035] transition-all active:scale-95">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <!-- Month -->
      <template v-if="calendarView === 'month'">
        <div class="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
          <div v-for="day in weekDays" :key="day" class="text-center text-[10px] sm:text-xs font-semibold text-[#3d5a4a] p-1 sm:p-1.5 uppercase tracking-wider">{{ day }}</div>
        </div>
        <div class="grid grid-cols-7 gap-0.5 sm:gap-1">
          <button v-for="(day, index) in displayedCalendarDays" :key="index"
            @click="day && handleDateClick(day)" :disabled="!day"
            :class="['min-h-12 sm:min-h-14 md:min-h-16 p-1 sm:p-1.5 rounded-lg text-[10px] sm:text-xs font-medium cursor-pointer bg-[#0d1410] text-[#8fb89f] transition-all relative flex flex-col items-start justify-start border',
              { 'border-[#1a2820] hover:border-[#2a4035] hover:bg-[#111a14]': day && !isDateDisabled(day),
                'border-transparent opacity-40': day && isDateDisabled(day),
                'border-[#4ade80]/40 bg-[#4ade80]/5 ring-1 ring-[#4ade80]/20': selectedDate && day && formatDate(day) === formatDate(selectedDate),
                'border-[#1a2820] bg-[#111f16]': day && !isDateDisabled(day) && formatDate(day) === todayFormatted && !(selectedDate && formatDate(day) === formatDate(selectedDate)) }]">
            <template v-if="day">
              <div class="flex items-center justify-between w-full">
                <span :class="['text-[10px] sm:text-xs font-bold', formatDate(day) === todayFormatted ? 'text-[#4ade80]' : 'text-[#8fb89f]']">{{ day.getDate() }}</span>
                <span v-if="getTaskCountForDate(day)" class="px-1 py-0.5 rounded-full bg-[#4ade80]/10 text-[8px] sm:text-[9px] font-bold text-[#4ade80]">{{ getTaskCountForDate(day) }}</span>
              </div>
              <div v-if="getTaskCountForDate(day)" class="mt-0.5 text-[8px] sm:text-[9px] text-[#3d5a4a] truncate w-full flex items-center gap-0.5">
                <span>{{ getTaskCountForDate(day) }}<span class="hidden sm:inline"> task</span></span>
                <span v-if="getMeetingCountForDate(day)" class="text-blue-400"><span class="hidden sm:inline">| </span>{{ getMeetingCountForDate(day) }}<span class="hidden sm:inline"> mtg</span></span>
              </div>
            </template>
          </button>
        </div>
      </template>

      <!-- Week -->
      <template v-else-if="calendarView === 'week'">
        <div class="flex border-b border-[#1a2820] overflow-x-auto bg-[#0a0f0b]">
          <div class="w-14 sm:w-16 flex-shrink-0 border-r border-[#1a2820]"></div>
          <div class="flex-1 grid grid-cols-7 min-w-[600px] sm:min-w-0">
            <template v-for="(day, index) in weekCalendarDays" :key="index">
              <div v-if="day" @click="handleDateClick(day)"
                :class="['p-2 sm:p-3 text-center border-r border-[#1a2820] cursor-pointer transition-all',
                  formatDate(day) === todayFormatted ? 'bg-[#4ade80]/5 border-b-2 border-b-[#4ade80]/50' : 'hover:bg-[#111a14]',
                  selectedDate && formatDate(day) === formatDate(selectedDate) ? 'ring-1 ring-inset ring-[#4ade80]/20 bg-[#4ade80]/5' : '']">
                <div class="text-[9px] sm:text-[10px] font-semibold text-[#3d5a4a] mb-0.5 uppercase tracking-wider">{{ weekDays[day.getDay()] }}</div>
                <div :class="['text-base sm:text-xl font-bold', formatDate(day) === todayFormatted ? 'text-[#4ade80]' : 'text-[#c8ddd5]']">{{ day.getDate() }}</div>
              </div>
            </template>
          </div>
        </div>
        <div class="flex overflow-x-auto bg-[#0a0f0b]">
          <div class="w-14 sm:w-16 flex-shrink-0 border-r border-[#1a2820]">
            <div v-for="hour in timeSlots" :key="hour" class="h-12 sm:h-14 md:h-16 border-b border-[#131e17]/60 flex items-start justify-end pr-2">
              <span class="text-[9px] sm:text-[10px] text-[#2d4035] leading-none select-none whitespace-nowrap" style="margin-top:-0.5em">{{ formatHour(hour) }}</span>
            </div>
          </div>
          <div class="flex-1 grid grid-cols-7 min-w-[600px] sm:min-w-0">
            <template v-for="(day, dayIndex) in weekCalendarDays" :key="dayIndex">
              <div v-if="day" class="relative border-r border-[#131e17]" :class="{'bg-[#4ade80]/[0.02]': formatDate(day) === todayFormatted}">
                <div v-for="hour in timeSlots" :key="hour" class="h-12 sm:h-14 md:h-16 border-b border-[#131e17] hover:bg-[#111a14]/50 cursor-pointer transition-colors" @click="handleDateClick(day)"></div>
                <div v-if="formatDate(day) === todayFormatted && getCurrentTimePosition()?.display" :style="{position:'absolute',top:`${getCurrentTimePosition()?.top}px`,left:'0',right:'0',zIndex:20,pointerEvents:'none'}" class="flex items-center">
                  <div class="w-2 h-2 rounded-full bg-[#4ade80] -ml-1 flex-shrink-0 shadow-[0_0_6px_#4ade80]"></div>
                  <div class="flex-1 h-px bg-[#4ade80]/60"></div>
                </div>
                <div v-for="task in getAllTasksForDay(day)" :key="task.id"
                  :style="{position:'absolute',top:`${getTaskPosition(task.time, getHourSlotHeight()).top}px`,height:`${Math.max(getTaskPosition(task.time, getHourSlotHeight()).height*0.85,40)}px`,left:'3px',right:'3px',zIndex:10}"
                  :class="['rounded px-1.5 py-1 text-[9px] sm:text-[10px] font-medium cursor-pointer overflow-hidden border-l-2 transition-all hover:brightness-110',
                    task.meetingUrl ? 'bg-blue-500/20 border-l-blue-400 text-blue-200' : task.completed ? 'bg-[#1a2820]/60 border-l-[#2a4035] text-[#3d5a4a] opacity-60' : 'bg-[#4ade80]/10 border-l-[#4ade80]/50 text-[#b8ddc8]']"
                  @click.stop="handleDateClick(day)">
                  <div class="font-bold truncate">{{ task.time }}</div>
                  <div class="truncate">{{ task.title }}</div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Day -->
      <template v-else-if="calendarView === 'day'">
        <div v-if="selectedDate" class="flex border-b border-[#1a2820] bg-[#0a0f0b]">
          <div class="w-14 sm:w-16 flex-shrink-0 border-r border-[#1a2820]"></div>
          <div :class="['flex-1 p-4 sm:p-6 text-center', formatDate(selectedDate) === todayFormatted ? 'bg-[#4ade80]/5 border-b-2 border-b-[#4ade80]/40' : '']">
            <div class="text-xs sm:text-sm font-semibold text-[#3d5a4a] mb-1 uppercase tracking-wider">{{ weekDays[selectedDate.getDay()] }}</div>
            <div :class="['text-3xl sm:text-5xl font-bold', formatDate(selectedDate) === todayFormatted ? 'text-[#4ade80]' : 'text-[#c8ddd5]']">{{ selectedDate.getDate() }}</div>
            <div class="text-xs text-[#3d5a4a] mt-1">{{ formatDate(selectedDate) }}</div>
          </div>
        </div>
        <div v-if="selectedDate" class="flex overflow-x-auto bg-[#0a0f0b]">
          <div class="w-14 sm:w-16 flex-shrink-0 border-r border-[#1a2820]">
            <div v-for="hour in timeSlots" :key="hour" class="h-12 sm:h-14 md:h-16 border-b border-[#131e17]/60 flex items-start justify-end pr-2">
              <span class="text-[9px] sm:text-[10px] text-[#2d4035] leading-none select-none whitespace-nowrap" style="margin-top:-0.5em">{{ formatHour(hour) }}</span>
            </div>
          </div>
          <div class="flex-1 border-l border-[#1a2820] relative" :class="{'bg-[#4ade80]/[0.015]': formatDate(selectedDate) === todayFormatted}">
            <div v-for="hour in timeSlots" :key="hour" class="h-12 sm:h-14 md:h-16 border-b border-[#131e17] hover:bg-[#111a14]/40 cursor-pointer transition-colors" @click="handleDateClick(selectedDate)"></div>
            <div v-if="formatDate(selectedDate) === todayFormatted && getCurrentTimePosition()?.display" :style="{position:'absolute',top:`${getCurrentTimePosition()?.top}px`,left:'0',right:'0',zIndex:20,pointerEvents:'none'}" class="flex items-center">
              <div class="w-2.5 h-2.5 rounded-full bg-[#4ade80] -ml-1.5 flex-shrink-0 shadow-[0_0_8px_#4ade80]"></div>
              <div class="flex-1 h-px bg-[#4ade80]/60"></div>
            </div>
            <div v-for="task in getAllTasksForDay(selectedDate)" :key="task.id"
              :style="{position:'absolute',top:`${getTaskPosition(task.time, getHourSlotHeight()).top}px`,height:`${Math.max(getTaskPosition(task.time, getHourSlotHeight()).height*0.9,56)}px`,left:'8px',right:'8px',zIndex:10}"
              :class="['rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium cursor-pointer overflow-hidden border-l-4 transition-all hover:brightness-110 shadow-lg',
                task.meetingUrl ? 'bg-blue-500/20 border-l-blue-400 text-blue-100' : task.completed ? 'bg-[#1a2820]/60 border-l-[#2a4035] text-[#3d5a4a] opacity-60' : 'bg-[#4ade80]/10 border-l-[#4ade80]/50 text-[#c8ddd5]']"
              @click.stop="handleDateClick(selectedDate)">
              <div class="flex items-center justify-between mb-1">
                <div class="font-bold text-sm sm:text-base">{{ task.time }} - {{ task.endTime || '...' }}</div>
                <div v-if="task.meetingUrl" class="flex items-center gap-1 text-[10px] text-blue-300 font-semibold">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>
                  Meeting
                </div>
              </div>
              <div class="font-bold truncate">{{ task.title }}</div>
              <div v-if="selectedDate && getMultiDayLabel(task, formatDate(selectedDate))" class="inline-block text-[10px] bg-[#4ade80]/20 text-[#4ade80] px-1.5 py-0.5 rounded font-bold mt-1">{{ getMultiDayLabel(task, formatDate(selectedDate)) }}</div>
              <div v-if="task.description" class="text-[10px] sm:text-xs opacity-70 line-clamp-2 mt-1">{{ task.description }}</div>
            </div>
          </div>
        </div>
        <div v-else class="flex items-center justify-center py-16 text-[#2d4035]"><p class="text-sm">Select a date to view</p></div>
      </template>
    </div>

    <!-- Selected Day Tasks Summary -->
    <div v-if="selectedDate" class="bg-[#0d1410] border border-[#1a2820] rounded-xl sm:rounded-2xl p-4 sm:p-5">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-bold text-[#c8ddd5]">{{ formatDate(selectedDate) }}</h2>
          <span class="px-2 py-0.5 rounded-md bg-[#132218] border border-[#1f3228] text-[10px] font-bold text-[#4a6b58]">{{ currentTasks.length }} tasks</span>
        </div>
        <div class="flex gap-2">
          <button v-if="!isDateDisabled(selectedDate)" @click="showAddForm = true"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/25 text-[#4ade80] text-xs font-semibold hover:bg-[#4ade80]/15 hover:border-[#4ade80]/40 active:scale-95 transition-all">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span class="hidden sm:inline">Add Task</span><span class="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div v-if="currentTasks.length === 0" class="text-center py-8 text-[#2d4035]"><p class="text-sm">No tasks scheduled</p></div>
      <div v-else class="space-y-2 max-h-80 overflow-y-auto">
        <div v-for="task in currentTasks" :key="task.id"
          :class="['bg-[#0a0f0b] border rounded-xl p-3 flex items-start gap-3 transition-all',
            task.completed ? 'border-[#1a2820] opacity-50' : 'border-[#1a2820] hover:border-[#2a4035]']">
          <div class="mt-1 flex-shrink-0">
            <div v-if="task.completed" class="w-4 h-4 rounded bg-[#4a6b58] flex items-center justify-center">
              <svg class="w-2.5 h-2.5 text-[#070c09]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div v-else class="w-4 h-4 rounded border border-[#2a4035]"></div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span v-if="task.time" class="text-xs font-mono text-[#4a6b58]">{{ task.time }}{{ task.endTime ? ` - ${task.endTime}` : '' }}</span>
              <span v-if="task.meetingUrl" class="px-1.5 py-0.5 rounded bg-blue-900/40 text-[9px] font-semibold text-blue-300 border border-blue-800/30">Meeting</span>
            </div>
            <h3 :class="['text-sm font-semibold text-[#c8ddd5] break-words', {'line-through opacity-50': task.completed}]">{{ task.title }}</h3>
          </div>
        </div>
      </div>

      <div v-if="isDateDisabled(selectedDate)" class="mt-3 p-3 bg-amber-950/30 border border-amber-800/30 rounded-xl text-xs text-amber-400">
        This date is in the past. Viewing only.
      </div>
    </div>
  </div>

  <!-- Add Task Modal -->
  <div
    v-if="showAddForm && selectedDate && !isDateDisabled(selectedDate)"
    class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
    @click.self="() => { showAddForm = false; editingTaskId = null; }"
  >
    <div class="bg-[#0d1a11]/80 backdrop-blur-md border border-[#1f3228] rounded-2xl shadow-2xl shadow-black/80 w-full max-w-lg max-h-[95vh] overflow-y-auto">
      <div class="sticky top-0 z-10 bg-[#0d1a11]/95 backdrop-blur-sm border-b border-[#1f3228] px-5 pt-4 pb-3.5 flex items-start justify-between rounded-t-2xl">
        <div>
          <h3 class="text-base font-bold text-[#c8ddd5] leading-tight">{{ editingTaskId ? 'Edit Task' : 'New Task' }}</h3>
          <p class="text-[10px] text-[#3d5a4a] mt-0.5 font-mono">{{ formatDate(selectedDate) }}</p>
        </div>
        <button @click="() => { showAddForm = false; editingTaskId = null; }"
          class="w-8 h-8 flex items-center justify-center rounded-xl bg-[#132218] border border-[#1f3228] text-[#4a6b58] hover:text-white hover:border-[#2a4035] active:scale-95 transition-all mt-0.5">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="p-5 flex flex-col gap-3.5">
        <input v-model="newTask.title" type="text" placeholder="Task title *"
          class="w-full p-3.5 bg-[#0a0f0b] border border-[#1f3228] text-[#c8ddd5] rounded-xl text-sm outline-none focus:border-[#4ade80]/50 focus:ring-2 focus:ring-[#4ade80]/10 placeholder-[#2d4035] transition-all font-medium" />

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
              <span class="text-[#4a6b58] font-mono">{{ formatDate(selectedDate) }}</span>
              <svg class="w-3 h-3 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span class="text-[#8fb89f] font-mono">{{ endDatePreview }}</span>
            </div>
          </div>
        </div>

        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17]"><span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Time Range</span></div>
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

        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17] flex items-center justify-between">
            <span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Description</span>
            <span class="text-[9px] text-[#2d4035]">each line = bullet</span>
          </div>
          <textarea v-model="newTask.description" placeholder="Enter each point on a new line" rows="3"
            class="w-full p-3.5 bg-transparent text-[#c8ddd5] text-sm resize-none outline-none placeholder-[#2d4035] font-mono leading-relaxed" />
        </div>

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

  <!-- Calendar Navigation Popup -->
  <div v-if="showCalendarPopup" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-40 pt-16 sm:pt-20" @click.self="showCalendarPopup = false">
    <div class="bg-[#0d1a11]/80 backdrop-blur-md border border-[#1f3228] rounded-2xl shadow-2xl shadow-black/70 w-72 p-4">
      <div class="flex items-center justify-between mb-3">
        <button @click="changePopupMonth(-1)" class="p-1.5 rounded-lg bg-[#0a0f0b] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#2a4035] transition-all active:scale-95">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="text-sm font-bold text-[#c8ddd5]">{{ popupMonthTitle }}</span>
        <button @click="changePopupMonth(1)" class="p-1.5 rounded-lg bg-[#0a0f0b] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#2a4035] transition-all active:scale-95">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="grid grid-cols-7 mb-1">
        <div v-for="d in ['S','M','T','W','T','F','S']" :key="d" class="text-center text-[9px] font-bold text-[#2d4035] py-1 uppercase">{{ d }}</div>
      </div>
      <div class="grid grid-cols-7 gap-0.5">
        <template v-for="(day, i) in popupCalendarDays" :key="i">
          <button v-if="day" @click="selectPopupDate(day)"
            :class="['w-full aspect-square rounded-lg text-xs font-medium transition-all border',
              formatDate(day) === todayFormatted ? 'bg-[#4ade80] text-[#070c09] border-[#4ade80]' : 'bg-transparent border-transparent hover:bg-[#132218] hover:border-[#1f3228] text-[#8fb89f]',
              selectedDate && formatDate(day) === formatDate(selectedDate) ? 'ring-1 ring-[#4ade80]/40' : '']">{{ day.getDate() }}</button>
          <div v-else class="w-full aspect-square" />
        </template>
      </div>
      <button @click="selectPopupDate(new Date())" class="w-full mt-3 p-2 text-xs font-semibold text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-xl hover:bg-[#4ade80]/15 transition-colors active:scale-[0.98]">
        Go to Today
      </button>
    </div>
  </div>
</template>
