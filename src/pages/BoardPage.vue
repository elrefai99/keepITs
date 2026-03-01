<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from '../stores/store'
import { formatDate, isDateDisabled } from '../utils/dateUtils'
import { useCalendar } from '../shared/useCalendar'
import { useTaskLogic } from '../shared/useTaskLogic'
import { useDragDrop } from '../shared/useDragDrop'
import { addDaysToDate } from '../firebase/tasks'

const store = useScheduleStore()
const { todayFormatted, selectedDate } = useCalendar()
const currentTime = ref(new Date())

const {
  showAddForm, editingTaskId, newTask, endDatePreview,
  currentTasks, categorizedTasks, handleAddTask, handleEditTask,
  toggleComplete, deleteTaskItem, openGoogleCalendarForTask,
  checkAndCompletePassedTasks, isCurrentTask, isNextTask
} = useTaskLogic(store, selectedDate, todayFormatted, currentTime)

// Default to today
if (!selectedDate.value) selectedDate.value = new Date()

const columns = [
  { id: 'willStart', title: 'To Do', colorDot: 'bg-blue-400' },
  { id: 'workedOn', title: 'In Progress', colorDot: 'bg-[#4ade80]' },
  { id: 'ended', title: 'Done', colorDot: 'bg-[#4a6b58]' }
]

const getTasksForColumn = (columnId: string) => {
  if (columnId === 'willStart') return categorizedTasks.value.willStart
  if (columnId === 'workedOn') return categorizedTasks.value.workedOn
  if (columnId === 'ended') return categorizedTasks.value.ended
  return []
}

// Inline add
const inlineAddColumn = ref<string | null>(null)
const inlineAddText = ref('')

const openInlineAdd = (colId: string) => { inlineAddColumn.value = colId; inlineAddText.value = '' }
const cancelInlineAdd = () => { inlineAddColumn.value = null; inlineAddText.value = '' }
const submitInlineAdd = () => {
  const title = inlineAddText.value.trim()
  if (!title || !selectedDate.value) { cancelInlineAdd(); return }
  const dateKey = formatDate(selectedDate.value)
  store.addTask(dateKey, {
    title,
    time: '',
    endTime: '',
    description: '',
    completed: inlineAddColumn.value === 'ended',
    status: inlineAddColumn.value ?? 'willStart',
    durationDays: 1,
    startDate: dateKey,
    meetingType: 'none',
    meetingUrl: '',
    guestEmails: []
  })
  inlineAddText.value = ''
}

const { draggedTaskId, draggedOverTaskId, draggedOverColumn, handleDragStart, handleDragOver, handleDragLeave, handleColumnDragOver, handleColumnDragLeave, handleDragEnd, handleDrop } = useDragDrop(selectedDate, store, currentTasks, getTasksForColumn)

const descLines = (desc: string): string[] =>
  desc ? desc.split('\n').map(l => l.trim()).filter(l => l.length > 0) : []

// Date selector
const showDatePicker = ref(false)
const datePickerDate = ref(new Date())
const monthNames2 = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const datePickerDays = computed(() => {
  const year = datePickerDate.value.getFullYear()
  const month = datePickerDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (Date | null)[] = []
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
  return days
})

const datePickerTitle = computed(() => `${monthNames2[datePickerDate.value.getMonth()]} ${datePickerDate.value.getFullYear()}`)
const changeDatePickerMonth = (d: number) => { datePickerDate.value = new Date(datePickerDate.value.getFullYear(), datePickerDate.value.getMonth() + d, 1) }
const selectDate = (date: Date) => { selectedDate.value = date; showDatePicker.value = false }

const getMultiDayLabel = (task: any, dateKey: string): string => {
  if (!task.durationDays || task.durationDays <= 1) return ''
  const start = new Date(task.startDate + 'T00:00:00')
  const cur = new Date(dateKey + 'T00:00:00')
  const diff = Math.round((cur.getTime() - start.getTime()) / 86400000) + 1
  return `Day ${diff}/${task.durationDays}`
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
        <div class="w-9 h-9 rounded-xl bg-[#132218] border border-[#2a4035] flex items-center justify-center">
          <svg class="w-5 h-5 text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-white">Todo Board</h1>
          <p class="text-[10px] text-[#4a6b58] font-mono">{{ selectedDate ? formatDate(selectedDate) : 'Select a date' }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="showDatePicker = true"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111a14] border border-[#1a2820] text-[#8fb89f] text-xs font-semibold hover:border-[#2a4035] hover:text-[#4ade80] transition-all">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Change Date
        </button>
        <button v-if="selectedDate && !isDateDisabled(selectedDate)" @click="showAddForm = true"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/25 text-[#4ade80] text-xs font-semibold hover:bg-[#4ade80]/15 hover:border-[#4ade80]/40 active:scale-95 transition-all">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Task
        </button>
      </div>
    </div>

    <!-- Disabled date notice -->
    <div v-if="selectedDate && isDateDisabled(selectedDate)" class="p-3 bg-amber-950/30 border border-amber-800/30 rounded-xl text-xs text-amber-400">
      This date is in the past. Viewing only.
    </div>

    <!-- Kanban Board -->
    <div v-if="selectedDate" class="flex gap-3 overflow-x-auto pb-3" style="scrollbar-width:thin;scrollbar-color:#1a2820 transparent">
      <div
        v-for="column in columns"
        :key="column.id"
        @dragover="handleColumnDragOver($event, column.id)"
        @dragleave="handleColumnDragLeave"
        @drop="handleDrop($event, undefined, column.id)"
        class="flex-shrink-0 w-72 sm:w-80 lg:w-[calc(33.333%-0.5rem)] lg:flex-shrink flex flex-col rounded-2xl border transition-all"
        :class="[draggedOverColumn === column.id ? 'border-[#4ade80]/30 bg-[#0d1a11]' : 'border-[#1a2820] bg-[#0a0f0b]']"
      >
        <!-- Column header -->
        <div class="flex items-center gap-2 px-3 pt-3 pb-2.5 border-b border-[#131e17]">
          <div :class="['w-2 h-2 rounded-full flex-shrink-0', column.colorDot]"></div>
          <h3 class="text-[11px] font-bold text-[#8fb89f] tracking-widest uppercase flex-1">{{ column.title }}</h3>
          <span class="min-w-[1.25rem] h-5 px-1 rounded-md bg-[#132218] border border-[#1f3228] text-[10px] font-bold text-[#4a6b58] flex items-center justify-center">
            {{ getTasksForColumn(column.id).length }}
          </span>
          <button
            v-if="!isDateDisabled(selectedDate) && inlineAddColumn !== column.id"
            @click="openInlineAdd(column.id)"
            title="Add a card"
            class="w-5 h-5 rounded-md text-[#3d5a4a] hover:text-[#4ade80] hover:bg-[#132218] flex items-center justify-center transition-all"
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <!-- Cards -->
        <div
          class="flex-1 px-2 pt-2 pb-0 space-y-2 overflow-y-auto"
          style="max-height:600px;min-height:48px;scrollbar-width:thin;scrollbar-color:#1a2820 transparent"
          :class="[draggedOverColumn === column.id ? 'bg-[#4ade80]/[0.025] rounded-lg' : '']"
        >
          <!-- Empty state -->
          <div v-if="getTasksForColumn(column.id).length === 0 && inlineAddColumn !== column.id"
            class="flex flex-col items-center justify-center py-8 gap-1.5 text-[#2a3d2e] select-none">
            <svg class="w-7 h-7 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
            <span class="text-[10px]">No cards</span>
          </div>

          <!-- Task card -->
          <div
            v-for="task in getTasksForColumn(column.id)"
            :key="task.id"
            draggable="true"
            @dragstart="handleDragStart($event, task.id)"
            @dragover="handleDragOver($event, task.id)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, task.id)"
            @dragend="handleDragEnd"
            :class="[
              'group relative rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all select-none',
              draggedTaskId === task.id ? 'opacity-40 scale-95 rotate-1' : '',
              draggedOverTaskId === task.id ? 'border-[#4ade80]/40 bg-[#0d1f14]' : 'border-[#1f3228] bg-[#0d1a11] hover:border-[#2a4035] hover:bg-[#0f1d13]',
              column.id === 'ended' ? 'opacity-60' : ''
            ]"
          >
            <!-- Top row -->
            <div class="flex items-start gap-2">
              <button @click.stop="toggleComplete(task.id)" :disabled="isDateDisabled(selectedDate)"
                :class="['w-4 h-4 mt-0.5 border rounded flex-shrink-0 flex items-center justify-center transition-all',
                  task.completed ? 'bg-[#4ade80] border-[#4ade80]' : 'border-[#2a4035] hover:border-[#4ade80]/60 bg-transparent']">
                <svg v-if="task.completed" class="w-2.5 h-2.5 text-[#070c09]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <h4 :class="['flex-1 text-xs sm:text-sm font-semibold break-words leading-snug min-w-0',
                task.completed || column.id === 'ended' ? 'text-[#3d5a4a] line-through' : 'text-[#c8ddd5]']">
                {{ task.title }}
              </h4>
              <div class="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button v-if="!isDateDisabled(selectedDate)" @click.stop="handleEditTask(task)"
                  title="Edit" class="w-6 h-6 rounded-lg bg-[#132218] text-[#3d5a4a] hover:text-[#4ade80] flex items-center justify-center transition-all">
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button v-if="!isDateDisabled(selectedDate)" @click.stop="deleteTaskItem(task.id)"
                  title="Delete" class="w-6 h-6 rounded-lg bg-[#1a0f0f] text-[#3d5a4a] hover:text-red-400 hover:bg-red-950/50 flex items-center justify-center transition-all">
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </div>

            <!-- Time -->
            <div v-if="task.time" class="mt-2 flex items-center gap-1 text-[10px] text-[#3d5a4a] font-mono">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {{ task.time }}{{ task.endTime ? ` - ${task.endTime}` : '' }}
            </div>

            <!-- Description -->
            <div v-if="task.description" class="mt-2 space-y-0.5">
              <div v-for="(line, i) in descLines(task.description)" :key="i" class="flex items-start gap-1 text-[10px] text-[#3d5a4a]">
                <span class="text-[#2d4035] mt-0.5 flex-shrink-0">-</span>
                <span class="break-words">{{ line }}</span>
              </div>
            </div>

            <!-- Footer badges -->
            <div class="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span v-if="isCurrentTask(task.id) && selectedDate && formatDate(selectedDate) === todayFormatted" class="px-1.5 py-0.5 bg-[#4ade80]/15 text-[#4ade80] text-[9px] font-bold rounded border border-[#4ade80]/20 flex items-center gap-0.5">
                <svg class="w-2 h-2" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>ACTIVE
              </span>
              <span v-if="isNextTask(task.id) && selectedDate && formatDate(selectedDate) === todayFormatted && column.id === 'willStart'" class="px-1.5 py-0.5 bg-blue-500/15 text-blue-300 text-[9px] font-bold rounded border border-blue-500/20">NEXT</span>
              <span v-if="task.meetingUrl && task.meetingType === 'google'" class="px-1.5 py-0.5 rounded bg-green-900/40 text-[9px] font-semibold text-green-300 border border-green-800/30 ml-auto">Meet</span>
              <span v-else-if="task.meetingUrl && task.meetingType === 'teams'" class="px-1.5 py-0.5 rounded bg-blue-900/40 text-[9px] font-semibold text-blue-300 border border-blue-800/30 ml-auto">Teams</span>
              <span v-if="selectedDate && getMultiDayLabel(task, formatDate(selectedDate))" class="text-[9px] bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 px-1.5 py-0.5 rounded font-bold">{{ getMultiDayLabel(task, formatDate(selectedDate)) }}</span>
            </div>
          </div>
        </div>

        <!-- Add a card zone -->
        <div class="px-2 pt-1.5 pb-2.5">
          <div v-if="inlineAddColumn === column.id" class="bg-[#0d1a11] border border-[#4ade80]/30 rounded-xl p-2.5 shadow-xl shadow-black/40">
            <textarea
              v-model="inlineAddText"
              placeholder="Enter a title for this card..."
              rows="2"
              autofocus
              @keydown.enter.prevent="submitInlineAdd"
              @keydown.escape="cancelInlineAdd"
              class="w-full bg-transparent text-[#c8ddd5] text-xs placeholder-[#2d4035] resize-none outline-none leading-relaxed"
            />
            <div class="flex items-center gap-1.5 mt-2">
              <button @click="submitInlineAdd"
                class="px-3 py-1.5 rounded-lg bg-[#4ade80] text-[#070c09] text-xs font-bold hover:bg-[#22c55e] active:scale-95 transition-all">
                Add card
              </button>
              <button @click="cancelInlineAdd" class="p-1.5 rounded-lg text-[#4a6b58] hover:text-white hover:bg-[#1a2820] transition-all">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <span class="ml-auto text-[9px] text-[#2d4035] select-none">Enter to add - Esc cancel</span>
            </div>
          </div>

          <button v-else-if="selectedDate && !isDateDisabled(selectedDate)" @click="openInlineAdd(column.id)"
            class="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[#3d5a4a] text-xs font-medium hover:bg-[#111a14] hover:text-[#8fb89f] transition-all group/btn">
            <svg class="w-3.5 h-3.5 group-hover/btn:text-[#4ade80] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add a card
          </button>
        </div>
      </div>
    </div>

    <!-- No date selected -->
    <div v-else class="flex flex-col items-center justify-center py-16 text-[#2d4035]">
      <svg class="w-12 h-12 opacity-30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <p class="text-sm">Select a date to view tasks</p>
    </div>
  </div>

  <!-- Add/Edit Task Modal -->
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

        <!-- Duration -->
        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17] flex items-center justify-between">
            <span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Duration (days)</span>
          </div>
          <div class="px-3.5 py-3">
            <div class="flex items-center gap-3">
              <button type="button" @click="newTask.durationDays = Math.max(1,(newTask.durationDays||1)-1)"
                class="w-8 h-8 rounded-lg bg-[#132218] border border-[#2a4035] text-[#4ade80] text-lg font-bold flex items-center justify-center hover:bg-[#1a3020] active:scale-90 transition-all leading-none">-</button>
              <input v-model.number="newTask.durationDays" type="number" min="1" max="365"
                class="w-14 text-center p-2 bg-[#0d1410] border border-[#1f3228] text-[#c8ddd5] rounded-lg text-sm font-bold outline-none focus:border-[#4ade80]/40" />
              <button type="button" @click="newTask.durationDays = (newTask.durationDays||1)+1"
                class="w-8 h-8 rounded-lg bg-[#132218] border border-[#2a4035] text-[#4ade80] text-lg font-bold flex items-center justify-center hover:bg-[#1a3020] active:scale-90 transition-all leading-none">+</button>
              <span class="text-xs text-[#3d5a4a]">{{ newTask.durationDays === 1 ? 'single day' : 'days' }}</span>
            </div>
            <div v-if="endDatePreview" class="mt-2.5 flex items-center gap-2 text-[10px]">
              <span class="text-[#4a6b58] font-mono">{{ formatDate(selectedDate) }}</span>
              <svg class="w-3 h-3 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span class="text-[#8fb89f] font-mono">{{ endDatePreview }}</span>
              <span class="ml-auto bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/20 px-1.5 py-0.5 rounded text-[10px] font-bold">{{ newTask.durationDays }}d</span>
            </div>
          </div>
        </div>

        <!-- Time -->
        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17]">
            <span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Time Range</span>
          </div>
          <div class="px-3.5 py-3 flex items-end gap-3">
            <div class="flex-1">
              <div class="text-[9px] text-[#2d4035] mb-1.5 uppercase tracking-widest font-semibold">Start</div>
              <input v-model="newTask.time" type="time" class="w-full p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#c8ddd5] rounded-lg text-sm outline-none focus:border-[#4ade80]/40 transition-all" />
            </div>
            <div class="pb-2.5 flex-shrink-0">
              <svg class="w-4 h-4 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
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
            @keydown.enter.prevent="newTask.description = newTask.description + '\n'"
            class="w-full p-3.5 bg-transparent text-[#c8ddd5] text-sm resize-none outline-none placeholder-[#2d4035] font-mono leading-relaxed" />
        </div>

        <!-- Meeting -->
        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17]">
            <span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Meeting</span>
          </div>
          <div class="px-3.5 py-3 flex flex-col gap-2.5">
            <select v-model="newTask.meetingType"
              class="w-full p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#8fb89f] rounded-lg text-sm outline-none focus:border-[#4ade80]/40 transition-all cursor-pointer appearance-none">
              <option value="none">No meeting</option>
              <option value="google">Google Meet</option>
              <option value="teams">Microsoft Teams</option>
              <option value="custom">Other link</option>
            </select>
            <template v-if="newTask.meetingType !== 'none'">
              <input v-model="newTask.meetingUrl" type="url" placeholder="Paste meeting link"
                class="w-full p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#8fb89f] rounded-lg text-xs outline-none focus:border-[#4ade80]/40 placeholder-[#2d4035] transition-all" />
              <div class="flex gap-2">
                <input v-model="newTask.guestEmailsText" type="text" placeholder="Guest emails, comma separated"
                  class="flex-1 p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#8fb89f] rounded-lg text-xs outline-none focus:border-[#4ade80]/40 placeholder-[#2d4035] transition-all" />
                <button type="button" @click="openGoogleCalendarForTask"
                  class="px-3 py-2 rounded-lg bg-[#132218] border border-[#2a4035] text-[#4ade80] text-xs font-semibold hover:bg-[#1a3020] active:scale-95 transition-all whitespace-nowrap">GCal</button>
              </div>
            </template>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2.5 pt-0.5">
          <button @click="handleAddTask"
            class="flex-1 py-3.5 rounded-xl font-bold text-sm bg-[#4ade80] text-[#070c09] hover:bg-[#22c55e] active:scale-[0.98] transition-all shadow-lg shadow-[#4ade80]/20 flex items-center justify-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline v-if="editingTaskId" points="20 6 9 17 4 12"/>
              <template v-else><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></template>
            </svg>
            {{ editingTaskId ? 'Update Task' : 'Add Task' }}
          </button>
          <button @click="() => { showAddForm = false; editingTaskId = null; }"
            class="flex-1 py-3.5 rounded-xl font-semibold text-sm bg-[#0a0f0b] border border-[#1f3228] text-[#4a6b58] hover:border-[#2a4035] hover:text-[#8fb89f] active:scale-[0.98] transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Date Picker Modal -->
  <div v-if="showDatePicker" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-40 pt-16 sm:pt-20" @click.self="showDatePicker = false">
    <div class="bg-[#0d1a11]/80 backdrop-blur-md border border-[#1f3228] rounded-2xl shadow-2xl shadow-black/70 w-72 p-4">
      <div class="flex items-center justify-between mb-3">
        <button @click="changeDatePickerMonth(-1)" class="p-1.5 rounded-lg bg-[#0a0f0b] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#2a4035] transition-all active:scale-95">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="text-sm font-bold text-[#c8ddd5]">{{ datePickerTitle }}</span>
        <button @click="changeDatePickerMonth(1)" class="p-1.5 rounded-lg bg-[#0a0f0b] border border-[#1a2820] text-[#4a6b58] hover:text-[#4ade80] hover:border-[#2a4035] transition-all active:scale-95">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="grid grid-cols-7 mb-1">
        <div v-for="d in ['S','M','T','W','T','F','S']" :key="d" class="text-center text-[9px] font-bold text-[#2d4035] py-1 uppercase">{{ d }}</div>
      </div>
      <div class="grid grid-cols-7 gap-0.5">
        <template v-for="(day, i) in datePickerDays" :key="i">
          <button v-if="day" @click="selectDate(day)"
            :class="['w-full aspect-square rounded-lg text-xs font-medium transition-all border',
              formatDate(day) === todayFormatted ? 'bg-[#4ade80] text-[#070c09] border-[#4ade80]' : 'bg-transparent border-transparent hover:bg-[#132218] hover:border-[#1f3228] text-[#8fb89f]',
              selectedDate && formatDate(day) === formatDate(selectedDate) ? 'ring-1 ring-[#4ade80]/40' : '']">{{ day.getDate() }}</button>
          <div v-else class="w-full aspect-square" />
        </template>
      </div>
      <button @click="selectDate(new Date())" class="w-full mt-3 p-2 text-xs font-semibold text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-xl hover:bg-[#4ade80]/15 transition-colors active:scale-[0.98]">
        Go to Today
      </button>
    </div>
  </div>
</template>
