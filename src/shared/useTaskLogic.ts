import { ref, computed } from 'vue'
import { formatDate, getMinutesFromTime, getCurrentTimeString, isDateDisabled } from '../utils/dateUtils'
import { addDaysToDate, DEFAULT_TASK_START_TIME, DEFAULT_TASK_END_TIME } from '../firebase/tasks'

export function useTaskLogic(store: any, selectedDate: any, todayFormatted: any, currentTime: any) {
     const showAddForm = ref(false)
     const editingTaskId = ref<string | null>(null)
     const showTodoList = ref(false)

     const getNowHHMM = (): string => {
          const now = new Date()
          return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
     }

     const getOneHourLaterHHMM = (): string => {
          const now = new Date()
          now.setHours(now.getHours() + 1)
          return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
     }

     const newTask = ref<any>({
          title: '',
          time: DEFAULT_TASK_START_TIME,
          endTime: DEFAULT_TASK_END_TIME,
          description: '',
          completed: false,
          meetingType: 'none',
          meetingUrl: '',
          guestEmailsText: '',
          durationDays: 1,
          useTimeRange: true,
          dailyTimes: {} as Record<string, { time: string; endTime: string }>
     })


     // Computed end date preview when durationDays > 1
     const endDatePreview = computed(() => {
          if (!selectedDate.value) return ''
          const days = Number(newTask.value.durationDays) || 1
          if (days <= 1) return ''
          const startStr = formatDate(selectedDate.value)
          return addDaysToDate(startStr, days - 1)
     })

     // Get current tasks for selected date (including multi-day tasks that span this date)
     const currentTasks = computed(() => {
          if (!selectedDate.value) return []
          const dateKey = formatDate(selectedDate.value)
          const tasks = store.getTasksSpanningDate(dateKey)
          // Sort by time AM → PM, tasks with no time go to end
          return tasks.sort((a: any, b: any) => {
               const ta = a.time || '99:99'
               const tb = b.time || '99:99'
               return ta.localeCompare(tb)
          })
     })

     // Categorize tasks for kanban board
     const categorizedTasks = computed(() => {
          if (!selectedDate.value) return { workedOn: [], willStart: [], ended: [] }

          const dateKey = formatDate(selectedDate.value)
          const isToday = dateKey === todayFormatted.value
          const tasks = currentTasks.value
          const currentTimeStr = getCurrentTimeString(currentTime.value)
          const currentMinutes = getMinutesFromTime(currentTimeStr)

          const workedOn: any[] = []
          const willStart: any[] = []
          const ended: any[] = []

          tasks.forEach((task: any) => {
               // Multi-day task: if it spans multiple days, treat as whole-day 'willStart' on non-start dates
               if (task.durationDays && task.durationDays > 1 && task.startDate !== dateKey) {
                    if (task.completed) ended.push(task)
                    else willStart.push(task)
                    return
               }

               const startMinutes = task.time ? getMinutesFromTime(task.time) : 0
               const endMinutes = task.endTime ? getMinutesFromTime(task.endTime) : startMinutes + 60

               if (task.completed) {
                    ended.push(task)
               } else if (isToday) {
                    if (currentMinutes > endMinutes) {
                         ended.push(task)
                    } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                         workedOn.push(task)
                    } else {
                         willStart.push(task)
                    }
               } else {
                    willStart.push(task)
               }
          })

          return { workedOn, willStart, ended }
     })

     const nextTask = computed(() => {
          const dateKey = todayFormatted.value
          const tasks = store.getTasksForDate(dateKey)
               .filter((task: any) => !task.completed)
               .sort((a: any, b: any) => (a.time || '99:99').localeCompare(b.time || '99:99'))

          const currentTimeStr = getCurrentTimeString(currentTime.value)
          return tasks.find((task: any) => task.time && task.time > currentTimeStr) || null
     })

     const currentActiveTask = computed(() => {
          const dateKey = todayFormatted.value
          const tasks = store.getTasksForDate(dateKey)
               .filter((task: any) => !task.completed)
               .sort((a: any, b: any) => (a.time || '99:99').localeCompare(b.time || '99:99'))

          const currentTimeStr = getCurrentTimeString(currentTime.value)
          const currentMinutes = getMinutesFromTime(currentTimeStr)

          return tasks.find((task: any) => {
               if (!task.time) return false
               const startMinutes = getMinutesFromTime(task.time)
               const endMinutes = task.endTime ? getMinutesFromTime(task.endTime) : startMinutes + 60
               return currentMinutes >= startMinutes && currentMinutes <= endMinutes
          }) || null
     })

     const checkAndCompletePassedTasks = () => {
          const dateKey = todayFormatted.value
          const tasks = store.getTasksForDate(dateKey)
          const currentTimeStr = getCurrentTimeString(currentTime.value)
          const currentMinutes = getMinutesFromTime(currentTimeStr)

          tasks.forEach((task: any) => {
               if (!task.completed && task.time) {
                    const startMinutes = getMinutesFromTime(task.time)
                    const endMinutes = task.endTime ? getMinutesFromTime(task.endTime) : startMinutes + 60
                    if (currentMinutes > endMinutes) {
                         store.toggleTaskComplete(dateKey, task.id)
                    }
               }
          })
     }

     const handleAddTask = () => {
          if (!newTask.value.title || !selectedDate.value) return

          const dateKey = formatDate(selectedDate.value)

          const guests = (newTask.value.guestEmailsText || '')
               .split(/[,;]+/)
               .map((e: string) => e.trim())
               .filter((e: string) => e.length > 0)

          const durationDays = Number(newTask.value.durationDays) || 1

          // For multi-day tasks, merge per-day time override into dailyTimes
          const existingDailyTimes: Record<string, { time: string; endTime: string }> =
               { ...(newTask.value.dailyTimes || {}) }

          if (durationDays > 1) {
               // Store the time set in the form as this day's override
               existingDailyTimes[dateKey] = {
                    time: newTask.value.time || DEFAULT_TASK_START_TIME,
                    endTime: newTask.value.endTime || DEFAULT_TASK_END_TIME
               }
          }

          const taskPayload = {
               ...newTask.value,
               guestEmails: guests,
               durationDays,
               startDate: editingTaskId.value
                    ? (newTask.value.startDate || dateKey)
                    : dateKey,
               endDate: durationDays > 1
                    ? addDaysToDate(editingTaskId.value ? (newTask.value.startDate || dateKey) : dateKey, durationDays - 1)
                    : (editingTaskId.value ? (newTask.value.startDate || dateKey) : dateKey),
               time: durationDays > 1 ? DEFAULT_TASK_START_TIME : (newTask.value.time || DEFAULT_TASK_START_TIME),
               endTime: durationDays > 1 ? DEFAULT_TASK_END_TIME : (newTask.value.endTime || DEFAULT_TASK_END_TIME),
               dailyTimes: existingDailyTimes
          }

          if (editingTaskId.value) {
               store.updateTask(dateKey, {
                    id: editingTaskId.value,
                    ...taskPayload
               })
          } else {
               store.addTask(dateKey, taskPayload)
          }

          newTask.value = {
               title: '',
               time: DEFAULT_TASK_START_TIME,
               endTime: DEFAULT_TASK_END_TIME,
               description: '',
               completed: false,
               meetingType: 'none',
               meetingUrl: '',
               guestEmailsText: '',
               durationDays: 1,
               useTimeRange: true,
               dailyTimes: {}
          }
          showAddForm.value = false
          editingTaskId.value = null
     }

     const handleEditTask = (task: any, forDateKey?: string) => {
          editingTaskId.value = task.id
          const durationDays = task.durationDays || 1
          const dailyTimes: Record<string, { time: string; endTime: string }> = { ...(task.dailyTimes || {}) }

          // For multi-day tasks: load this day's specific time if it exists,
          // otherwise fall back to the task's default (09:00/10:00)
          let editTime = task.time || DEFAULT_TASK_START_TIME
          let editEndTime = task.endTime || DEFAULT_TASK_END_TIME
          if (forDateKey && durationDays > 1) {
               const dayOverride = dailyTimes[forDateKey]
               if (dayOverride) {
                    editTime = dayOverride.time
                    editEndTime = dayOverride.endTime
               } else {
                    editTime = DEFAULT_TASK_START_TIME
                    editEndTime = DEFAULT_TASK_END_TIME
               }
          }

          newTask.value = {
               title: task.title,
               time: editTime,
               endTime: editEndTime,
               description: task.description || '',
               completed: task.completed,
               meetingType: task.meetingType || 'none',
               meetingUrl: task.meetingUrl || '',
               guestEmailsText: (task.guestEmails || []).join(', '),
               durationDays,
               startDate: task.startDate,
               useTimeRange: true,
               dailyTimes
          }
          showAddForm.value = true
     }

     const toggleComplete = (taskId: string) => {
          if (!selectedDate.value || isDateDisabled(selectedDate.value)) return
          const dateKey = formatDate(selectedDate.value)
          store.toggleTaskComplete(dateKey, taskId)
     }

     const deleteTaskItem = (taskId: string) => {
          if (!selectedDate.value || isDateDisabled(selectedDate.value)) return
          const dateKey = formatDate(selectedDate.value)
          store.deleteTask(dateKey, taskId)
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

     const isCurrentTask = (taskId: string) => {
          return currentActiveTask.value?.id === taskId
     }

     const isNextTask = (taskId: string) => {
          return nextTask.value?.id === taskId
     }

     return {
          showAddForm,
          editingTaskId,
          showTodoList,
          newTask,
          endDatePreview,
          currentTasks,
          categorizedTasks,
          nextTask,
          currentActiveTask,
          handleAddTask,
          handleEditTask,
          toggleComplete,
          deleteTaskItem,
          openGoogleCalendarForTask,
          checkAndCompletePassedTasks,
          isCurrentTask,
          isNextTask
     }
}
