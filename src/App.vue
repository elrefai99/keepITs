<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from './stores/store';
import { formatDate, formatHour, isDateDisabled, weekDays } from './utils/dateUtils'
import { getHourSlotHeight, getTaskPosition } from './utils/calendarUtils'
// @ts-ignore
import html2pdf from 'html2pdf.js'
import { useCalendar } from './shared/useCalendar'
import { useTaskLogic } from './shared/useTaskLogic'
import { useTimer } from './shared/useTimer'
import { useNotifications } from './shared/useNotifications'
import { useDragDrop } from './shared/useDragDrop'

    const store = useScheduleStore()
    const {todayFormatted,selectedDate,calendarView,weekCalendarDays,displayedCalendarDays,calendarTitle,changeMonth,handleDateClick: calendarHandleDateClick,timeSlots} = useCalendar()
    const currentTime = ref(new Date())
    const {showAddForm,editingTaskId,showTodoList,newTask,endDatePreview,currentTasks,categorizedTasks,currentActiveTask,handleAddTask,handleEditTask,toggleComplete,deleteTaskItem,openGoogleCalendarForTask,checkAndCompletePassedTasks,isCurrentTask,isNextTask} = useTaskLogic(store, selectedDate, todayFormatted, currentTime)

    const showCalendarPopup = ref(false)
    const popupDate = ref(new Date())
    const monthNames2 = ['January','February','March','April','May','June','July','August','September','October','November','December']
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

    const triggerNotification = ref(() => {})
    const onTimerComplete = () => {triggerNotification.value()}
    const {isBreakTime} = useTimer(currentActiveTask, onTimerComplete)
    const {checkUpcomingTasks,checkDayChange,showNotification} = useNotifications(store, todayFormatted, isBreakTime)
    triggerNotification.value = showNotification

    // ── Columns ─────────────────────────────────────────────────────────────────
    const columns = [
      { id: 'willStart', title: 'To Do',       colorDot: 'bg-blue-400' },
      { id: 'workedOn',  title: 'In Progress',  colorDot: 'bg-[#4ade80]' },
      { id: 'ended',     title: 'Done',         colorDot: 'bg-[#4a6b58]' }
    ]

    const getTasksForColumn = (columnId: string) => {
      if (columnId === 'willStart') return categorizedTasks.value.willStart
      if (columnId === 'workedOn')  return categorizedTasks.value.workedOn
      if (columnId === 'ended')     return categorizedTasks.value.ended
      return []
    }

    // ── Trello-style inline add ──────────────────────────────────────────────────
    const inlineAddColumn = ref<string | null>(null)
    const inlineAddText   = ref('')

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

    const {draggedTaskId,draggedOverTaskId,draggedOverColumn,handleDragStart,handleDragOver,handleDragLeave,handleColumnDragOver,handleColumnDragLeave,handleDragEnd,handleDrop} = useDragDrop(selectedDate, store, currentTasks, getTasksForColumn)

    const handleDateClick = (date: Date) => { calendarHandleDateClick(date); showAddForm.value = false }

    // ── Report ───────────────────────────────────────────────────────────────────
    const showReport = ref(false)
    const reportStats = computed(() => {
        const tasks = currentTasks.value
        const total = tasks.length
        const completed = tasks.filter((t: any) => t.completed).length
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0
        const pending = total - completed
        let message = 'Keep it up!'
        if (rate === 100 && total > 0) message = 'Perfect Day! 🌟'
        else if (rate >= 80) message = 'Great Job! 🚀'
        else if (rate >= 50) message = 'Good Effort! 👍'
        else if (total === 0) message = 'No tasks for today 🌴'
        else message = 'Tomorrow is a new start! 💪'
        return { total, completed, rate, pending, message }
    })

    const downloadReport = () => {
      const element = document.getElementById('daily-report-content')
      if (!element || !selectedDate.value) return
      const opt: any = {
        margin: 0.5,
        filename: `KeepITs_Report_${formatDate(selectedDate.value).replace(/ /g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a5', orientation: 'portrait' }
      }
      html2pdf().set(opt).from(element).save()
    }

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
      return store.getTasksSpanningDate(dateKey).sort((a: any, b: any) => (a.time||'').localeCompare(b.time||''))
    }

    const getMultiDayLabel = (task: any, dateKey: string): string => {
      if (!task.durationDays || task.durationDays <= 1) return ''
      const start = new Date(task.startDate + 'T00:00:00')
      const cur   = new Date(dateKey + 'T00:00:00')
      const diff  = Math.round((cur.getTime() - start.getTime()) / 86400000) + 1
      return `Day ${diff}/${task.durationDays}`
    }

    const getTaskCountForDate   = (date: Date) => store.getTasksSpanningDate(formatDate(date)).length
    const getMeetingCountForDate = (date: Date) => store.getTasksForDate(formatDate(date)).filter((t: any) => t.meetingUrl).length

    onMounted(async () => {
      if (!store.synced) await store.loadUserTasks()
      checkDayChange()
      setInterval(() => { currentTime.value = new Date(); checkAndCompletePassedTasks(); checkUpcomingTasks() }, 1000)
      setInterval(checkDayChange, 60000)
    })

    const descLines = (desc: string): string[] =>
      desc ? desc.split('\n').map(l => l.trim()).filter(l => l.length > 0) : []
</script>

<template>
  <navbar />
  <div class="min-h-screen bg-[#070c09] text-white font-sans">
    <div class="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div class="bg-[#0a0f0b] rounded-2xl sm:rounded-3xl border border-[#1a2820] overflow-hidden shadow-2xl shadow-black/60">

        <Header />

        <div class="p-3 sm:p-4 md:p-6">

          <!-- ── Calendar ── -->
          <div class="bg-[#0d1410] border border-[#1a2820] rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4">

            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 sm:mb-4">
              <div class="flex gap-1 w-full sm:w-auto">
                <button v-for="view in ['day','week','month']" :key="view" @click="calendarView = view"
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
                      <span v-if="getMeetingCountForDate(day)" class="text-blue-400"><span class="hidden sm:inline">· </span>{{ getMeetingCountForDate(day) }}<span class="hidden sm:inline"> mtg</span></span>
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
                      <div class="font-bold text-sm sm:text-base">{{ task.time }} – {{ task.endTime || '…' }}</div>
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

          <!-- ── Day detail ── -->
          <div class="mt-3 sm:mt-4">
            <div v-if="selectedDate" class="bg-[#0d1410] border border-[#1a2820] rounded-xl sm:rounded-2xl p-3 sm:p-4">

              <div class="flex justify-between items-center mb-3 sm:mb-4 flex-wrap gap-2">
                <h2 class="text-sm sm:text-base font-bold text-[#c8ddd5]">{{ formatDate(selectedDate) }}</h2>
                <div class="flex gap-2">
                  <button v-if="!isDateDisabled(selectedDate)" @click="showReport = true"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs font-semibold hover:bg-violet-500/15 hover:border-violet-400/35 active:scale-95 transition-all">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    <span class="hidden sm:inline">End Day Report</span><span class="sm:hidden">Report</span>
                  </button>
                  <button v-if="!isDateDisabled(selectedDate)" @click="showAddForm = true"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/25 text-[#4ade80] text-xs font-semibold hover:bg-[#4ade80]/15 hover:border-[#4ade80]/40 active:scale-95 transition-all">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span class="hidden sm:inline">Add Task</span><span class="sm:hidden">Add</span>
                  </button>
                </div>
              </div>

              <div class="flex gap-2 mb-3">
                <button @click="showTodoList = !showTodoList"
                  :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border',
                    showTodoList ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]' : 'bg-[#111a14] border-[#1a2820] text-[#4a6b58] hover:border-[#2a4035] hover:text-[#8fb89f]']">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Todo Board
                </button>
              </div>

              <div v-if="showTodoList" class="mb-4">
                <div class="flex gap-3 overflow-x-auto pb-3" style="scrollbar-width:thin;scrollbar-color:#1a2820 transparent">

                  <div
                    v-for="column in columns"
                    :key="column.id"
                    @dragover="handleColumnDragOver($event, column.id)"
                    @dragleave="handleColumnDragLeave"
                    @drop="handleDrop($event, undefined, column.id)"
                    class="flex-shrink-0 w-72 sm:w-80 flex flex-col rounded-2xl border transition-all"
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
                      style="max-height:500px;min-height:48px;scrollbar-width:thin;scrollbar-color:#1a2820 transparent"
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
                          draggedTaskId === task.id    ? 'opacity-40 scale-95 rotate-1' : '',
                          draggedOverTaskId === task.id ? 'border-[#4ade80]/40 bg-[#0d1f14]' : 'border-[#1f3228] bg-[#0d1a11] hover:border-[#2a4035] hover:bg-[#0f1d13]',
                          column.id === 'ended'         ? 'opacity-60' : ''
                        ]"
                      >
                        <!-- Top row: checkbox + title + actions -->
                        <div class="flex items-start gap-2">
                          <!-- Checkbox -->
                          <button @click.stop="toggleComplete(task.id)" :disabled="isDateDisabled(selectedDate)"
                            :class="['w-4 h-4 mt-0.5 border rounded flex-shrink-0 flex items-center justify-center transition-all',
                              task.completed ? 'bg-[#4ade80] border-[#4ade80]' : 'border-[#2a4035] hover:border-[#4ade80]/60 bg-transparent']">
                            <svg v-if="task.completed" class="w-2.5 h-2.5 text-[#070c09]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                          <!-- Title -->
                          <h4 :class="['flex-1 text-xs sm:text-sm font-semibold break-words leading-snug min-w-0',
                            task.completed || column.id === 'ended' ? 'text-[#3d5a4a] line-through' : 'text-[#c8ddd5]']">
                            {{ task.title }}
                          </h4>
                          <!-- Actions (appear on hover) -->
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
                          {{ task.time }}{{ task.endTime ? ` – ${task.endTime}` : '' }}
                        </div>

                        <!-- Description bullets -->
                        <div v-if="task.description" class="mt-2 space-y-0.5">
                          <div v-for="(line, i) in descLines(task.description)" :key="i" class="flex items-start gap-1 text-[10px] text-[#3d5a4a]">
                            <span class="text-[#2d4035] mt-0.5 flex-shrink-0">•</span>
                            <span class="break-words">{{ line }}</span>
                          </div>
                        </div>

                        <!-- Footer badges -->
                        <div class="mt-2.5 flex items-center gap-1.5 flex-wrap">
                          <span v-if="isCurrentTask(task.id) && formatDate(selectedDate) === todayFormatted" class="px-1.5 py-0.5 bg-[#4ade80]/15 text-[#4ade80] text-[9px] font-bold rounded border border-[#4ade80]/20 flex items-center gap-0.5">
                            <svg class="w-2 h-2" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>ACTIVE
                          </span>
                          <span v-if="isNextTask(task.id) && formatDate(selectedDate) === todayFormatted && column.id === 'willStart'" class="px-1.5 py-0.5 bg-blue-500/15 text-blue-300 text-[9px] font-bold rounded border border-blue-500/20">NEXT</span>
                          <span v-if="task.meetingUrl && task.meetingType === 'google'" class="px-1.5 py-0.5 rounded bg-green-900/40 text-[9px] font-semibold text-green-300 border border-green-800/30 ml-auto">Meet</span>
                          <span v-else-if="task.meetingUrl && task.meetingType === 'teams'" class="px-1.5 py-0.5 rounded bg-blue-900/40 text-[9px] font-semibold text-blue-300 border border-blue-800/30 ml-auto">Teams</span>
                          <span v-if="selectedDate && getMultiDayLabel(task, formatDate(selectedDate))" class="text-[9px] bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 px-1.5 py-0.5 rounded font-bold">{{ getMultiDayLabel(task, formatDate(selectedDate)) }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- ── "Add a card" zone ── -->
                    <div class="px-2 pt-1.5 pb-2.5">
                      <!-- Inline form -->
                      <div v-if="inlineAddColumn === column.id" class="bg-[#0d1a11] border border-[#4ade80]/30 rounded-xl p-2.5 shadow-xl shadow-black/40">
                        <textarea
                          v-model="inlineAddText"
                          placeholder="Enter a title for this card…"
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
                          <span class="ml-auto text-[9px] text-[#2d4035] select-none">↵ add · Esc cancel</span>
                        </div>
                      </div>

                      <!-- Static "Add a card" button -->
                      <button v-else-if="!isDateDisabled(selectedDate)" @click="openInlineAdd(column.id)"
                        class="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[#3d5a4a] text-xs font-medium hover:bg-[#111a14] hover:text-[#8fb89f] transition-all group/btn">
                        <svg class="w-3.5 h-3.5 group-hover/btn:text-[#4ade80] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add a card
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              <!-- List view -->
              <div v-else class="max-h-96 overflow-y-auto space-y-2">
                <div v-if="currentTasks.length === 0" class="text-center py-10 text-[#2d4035]"><p class="text-sm">No tasks scheduled</p></div>
                <div v-for="task in currentTasks" :key="task.id"
                  draggable="true"
                  @dragstart="handleDragStart($event, task.id)"
                  @dragover="handleDragOver($event, task.id)"
                  @dragleave="handleDragLeave"
                  @drop="handleDrop($event, task.id)"
                  @dragend="handleDragEnd"
                  :class="['bg-[#0a0f0b] border rounded-xl p-3 sm:p-4 flex justify-between items-start transition-all',
                    isCurrentTask(task.id) && formatDate(selectedDate) === todayFormatted ? 'border-[#4ade80]/30 bg-[#4ade80]/[0.04]' :
                    isNextTask(task.id) && formatDate(selectedDate) === todayFormatted ? 'border-blue-500/25 bg-blue-500/[0.04]' : 'border-[#1a2820] hover:border-[#2a4035]',
                    { 'opacity-50': task.completed },
                    draggedTaskId === task.id ? 'opacity-40' : '',
                    draggedOverTaskId === task.id ? 'border-[#4ade80]/40' : '']">
                  <div class="flex gap-2 sm:gap-3 flex-1 min-w-0">
                    <svg class="w-4 h-4 text-[#2d4035] flex-shrink-0 mt-1 cursor-move" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    <button @click="toggleComplete(task.id)" :disabled="isDateDisabled(selectedDate)"
                      :class="['w-4 h-4 sm:w-5 sm:h-5 border rounded flex items-center justify-center transition-all mt-0.5 flex-shrink-0', task.completed ? 'bg-[#4ade80] border-[#4ade80]' : 'border-[#2a4035] hover:border-[#4ade80]/60']">
                      <svg v-if="task.completed" class="w-2.5 h-2.5 text-[#070c09]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap mb-1">
                        <div class="flex items-center gap-1 text-[#3d5a4a] text-xs font-mono">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {{ task.time }} – {{ task.endTime || '…' }}
                        </div>
                        <span v-if="isCurrentTask(task.id) && formatDate(selectedDate) === todayFormatted" class="px-2 py-0.5 bg-[#4ade80]/15 text-[#4ade80] text-[9px] font-bold rounded-full border border-[#4ade80]/20 flex items-center gap-1">
                          <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>ACTIVE NOW
                        </span>
                        <span v-if="isNextTask(task.id) && formatDate(selectedDate) === todayFormatted" class="px-2 py-0.5 bg-blue-500/15 text-blue-300 text-[9px] font-bold rounded-full border border-blue-500/20">UP NEXT</span>
                      </div>
                      <h3 :class="['text-sm sm:text-base font-semibold text-[#c8ddd5] mb-1 break-words', {'line-through opacity-50': task.completed}]">{{ task.title }}</h3>
                      <div v-if="selectedDate && getMultiDayLabel(task, formatDate(selectedDate))" class="inline-block text-[10px] bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 px-1.5 py-0.5 rounded font-bold mb-1">{{ getMultiDayLabel(task, formatDate(selectedDate)) }}</div>
                      <div v-if="task.description" class="mt-1 space-y-0.5">
                        <div v-for="(line, i) in descLines(task.description)" :key="i" class="flex items-start gap-1 text-xs text-[#3d5a4a]">
                          <span class="flex-shrink-0">•</span><span class="break-words">{{ line }}</span>
                        </div>
                      </div>
                      <div v-if="task.meetingUrl" class="mt-2 flex items-center gap-2">
                        <span v-if="task.meetingType === 'google'" class="px-1.5 py-0.5 rounded-full bg-green-900/30 text-[10px] font-semibold text-green-300 border border-green-800/25">Google Meet</span>
                        <span v-else-if="task.meetingType === 'teams'" class="px-1.5 py-0.5 rounded-full bg-blue-900/30 text-[10px] font-semibold text-blue-300 border border-blue-800/25">Microsoft Teams</span>
                        <a :href="task.meetingUrl" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 text-[10px] font-medium border border-blue-500/20 hover:bg-blue-500/25 transition-colors">
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M5 5v14h14"/></svg>Join
                        </a>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 ml-2">
                    <button v-if="!isDateDisabled(selectedDate)" @click="handleEditTask(task)" class="p-1.5 text-[#3d5a4a] hover:text-[#4ade80] rounded-lg hover:bg-[#4ade80]/10 transition-all">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button v-if="!isDateDisabled(selectedDate)" @click="deleteTaskItem(task.id)" class="p-1.5 text-[#3d5a4a] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="isDateDisabled(selectedDate)" class="mt-3 p-3 bg-amber-950/30 border border-amber-800/30 rounded-xl text-xs text-amber-400">
                This date is in the past. Viewing only.
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center py-12 text-[#2d4035]">
              <svg class="w-12 h-12 opacity-30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <p class="text-sm">Select a date to view or add tasks</p>
            </div>
          </div>
        </div>
      </div>

      <footer class="mt-6 text-center pb-6">
        <p class="text-xs text-[#2d4035]">&copy; {{ new Date().getFullYear() }} KeepITs · created by
          <a href="https://github.com/elrefai99" target="_blank" rel="noopener" class="text-[#4a6b58] hover:text-[#4ade80] transition-colors">elrefai99</a></p>
      </footer>
    </div>
  </div>

  <div
    v-if="showAddForm && selectedDate && !isDateDisabled(selectedDate)"
    class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
    @click.self="() => { showAddForm = false; editingTaskId = null; }"
  >
    <div class="bg-[#0d1a11]/80 backdrop-blur-md border border-[#1f3228] rounded-2xl shadow-2xl shadow-black/80 w-full max-w-lg max-h-[95vh] overflow-y-auto">

      <!-- Sticky header -->
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

        <!-- Title input -->
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
                class="w-8 h-8 rounded-lg bg-[#132218] border border-[#2a4035] text-[#4ade80] text-lg font-bold flex items-center justify-center hover:bg-[#1a3020] active:scale-90 transition-all leading-none">−</button>
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

        <!-- Time range -->
        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17]">
            <span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Time Range</span>
          </div>
          <div class="px-3.5 py-3 flex items-end gap-3">
            <div class="flex-1">
              <div class="text-[9px] text-[#2d4035] mb-1.5 uppercase tracking-widest font-semibold">Start</div>
              <input v-model="newTask.time" type="time"
                class="w-full p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#c8ddd5] rounded-lg text-sm outline-none focus:border-[#4ade80]/40 transition-all" />
            </div>
            <div class="pb-2.5 flex-shrink-0">
              <svg class="w-4 h-4 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div class="flex-1">
              <div class="text-[9px] text-[#2d4035] mb-1.5 uppercase tracking-widest font-semibold">End</div>
              <input v-model="newTask.endTime" type="time"
                class="w-full p-2.5 bg-[#0d1410] border border-[#1f3228] text-[#c8ddd5] rounded-lg text-sm outline-none focus:border-[#4ade80]/40 transition-all" />
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="bg-[#0a0f0b] border border-[#1f3228] rounded-xl overflow-hidden">
          <div class="px-3.5 py-2 border-b border-[#131e17] flex items-center justify-between">
            <span class="text-[10px] font-bold text-[#3d5a4a] uppercase tracking-widest">Description</span>
            <span class="text-[9px] text-[#2d4035]">each line → bullet</span>
          </div>
          <textarea v-model="newTask.description" placeholder="• Enter each point on a new line" rows="3"
            @keydown.enter.prevent="newTask.description = newTask.description + '\n• '"
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

  <div v-if="showReport && selectedDate" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="showReport = false">
    <div class="bg-[#0d1a11]/80 backdrop-blur-md border border-[#1f3228] rounded-2xl shadow-2xl shadow-black/80 w-full max-w-md p-6 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-48 h-48 bg-[#4ade80]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div class="absolute bottom-0 left-0 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />
      <div class="relative z-10">
        <div id="daily-report-content" class="text-center">
          <div class="flex items-center justify-center gap-2 mb-1 mt-2">
            <div class="w-8 h-8 rounded-lg bg-[#132218] border border-[#2a4035] flex items-center justify-center">
              <svg class="w-4 h-4 text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h2 class="text-xl font-bold text-[#c8ddd5]">Daily Report</h2>
          </div>
          <p class="text-[#3d5a4a] text-sm mb-6">{{ formatDate(selectedDate) }}</p>
          <div class="flex justify-center mb-5">
            <div class="relative w-28 h-28">
              <svg class="w-full h-full -rotate-90">
                <circle cx="56" cy="56" r="48" fill="none" stroke="#1a2820" stroke-width="10"/>
                <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor"
                  :class="[reportStats.rate===100?'text-[#4ade80]':reportStats.rate>=80?'text-blue-400':reportStats.rate>=50?'text-amber-400':'text-red-400']"
                  stroke-width="10" stroke-dasharray="301.6" :stroke-dashoffset="301.6-(301.6*reportStats.rate)/100"
                  stroke-linecap="round" class="transition-all duration-1000"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="text-2xl font-bold text-white">{{ reportStats.rate }}<span class="text-sm text-[#4a6b58]">%</span></div>
                <div class="text-[9px] uppercase font-bold text-[#3d5a4a] tracking-wide">Efficiency</div>
              </div>
            </div>
          </div>
          <h3 class="text-base font-bold text-[#c8ddd5] mb-5">{{ reportStats.message }}</h3>
          <div class="grid grid-cols-3 gap-2.5 mb-5">
            <div class="p-3 bg-[#0a0f0b] border border-[#1a2820] rounded-xl"><div class="text-xl font-bold text-[#c8ddd5]">{{ reportStats.total }}</div><div class="text-[10px] text-[#3d5a4a] font-medium mt-0.5">Total</div></div>
            <div class="p-3 bg-[#0a1410] border border-[#4ade80]/15 rounded-xl"><div class="text-xl font-bold text-[#4ade80]">{{ reportStats.completed }}</div><div class="text-[10px] text-[#3d5a4a] font-medium mt-0.5">Done</div></div>
            <div class="p-3 bg-[#1a1200] border border-amber-800/25 rounded-xl"><div class="text-xl font-bold text-amber-400">{{ reportStats.pending }}</div><div class="text-[10px] text-[#3d5a4a] font-medium mt-0.5">Pending</div></div>
          </div>
          <div class="text-left bg-[#0a0f0b] border border-[#1a2820] rounded-xl p-3 sm:p-4">
            <h4 class="text-[10px] font-bold text-[#3d5a4a] mb-3 uppercase tracking-widest border-b border-[#1a2820] pb-2">Task Detail</h4>
            <div v-for="task in currentTasks" :key="task.id" class="flex items-start gap-3 py-2 border-b border-[#131e17] last:border-none">
              <div class="mt-0.5 flex-shrink-0">
                <svg v-if="task.completed" class="w-4 h-4 text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                <svg v-else class="w-4 h-4 text-[#2d4035]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <span :class="['text-xs font-semibold truncate pr-2', task.completed ? 'text-[#3d5a4a] line-through' : 'text-[#c8ddd5]']">{{ task.title }}</span>
                  <span class="text-[10px] font-mono text-[#3d5a4a] whitespace-nowrap bg-[#132218] border border-[#1f3228] px-1.5 py-0.5 rounded">{{ task.time }}</span>
                </div>
                <div v-if="task.description" class="text-[10px] text-[#2d4035] mt-0.5 line-clamp-1">{{ task.description }}</div>
              </div>
            </div>
            <div v-if="currentTasks.length === 0" class="text-center py-4 text-xs text-[#2d4035] italic">No tasks recorded.</div>
          </div>
        </div>
        <div class="flex flex-col gap-2 mt-4">
          <button @click="downloadReport" class="w-full py-3 rounded-xl font-bold text-sm bg-[#4ade80] text-[#070c09] hover:bg-[#22c55e] active:scale-[0.98] transition-all shadow-lg shadow-[#4ade80]/20 flex items-center justify-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </button>
          <button @click="showReport = false" class="w-full py-3 rounded-xl font-semibold text-sm bg-[#0a0f0b] border border-[#1f3228] text-[#4a6b58] hover:border-[#2a4035] hover:text-[#8fb89f] active:scale-[0.98] transition-all">Close</button>
        </div>
      </div>
    </div>
  </div>

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
