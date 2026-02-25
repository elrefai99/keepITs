import { ref, computed } from 'vue'
import { formatDate, getMinutesFromTime, getCurrentTimeString, isDateDisabled } from '../utils/dateUtils'
import { addDaysToDate } from '../firebase/tasks'

export function useTaskLogic(store: any, selectedDate: any, todayFormatted: any, currentTime: any) {
     const showAddForm = ref(false)
     const editingTaskId = ref<string | null>(null)
     const showTodoList = ref(true)

     const defaultNewTask = () => ({
          title: '',
          time: '09:00',
          endTime: '10:00',
          description: '',
          completed: false,
          meetingType: 'none',
          meetingUrl: '',
          guestEmailsText: '',
          durationDays: 1,       // ← new: how many days this task spans
          useTimeRange: true      // ← new: toggle between time range and all-day
     })

     const newTask = ref<any>(defaultNewTask())

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
          // Sort by order first, then by time
          return tasks.sort((a: any, b: any) => {
               if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order
               }
               return (a.time || '').localeCompare(b.time || '')
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
               .sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''))

          const currentTimeStr = getCurrentTimeString(currentTime.value)
          return tasks.find((task: any) => task.time && task.time > currentTimeStr) || null
     })

     const currentActiveTask = computed(() => {
          const dateKey = todayFormatted.value
          const tasks = store.getTasksForDate(dateKey)
               .filter((task: any) => !task.completed)
               .sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''))

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

          const taskPayload = {
               ...newTask.value,
               guestEmails: guests,
               durationDays,
               startDate: dateKey,
               endDate: durationDays > 1 ? addDaysToDate(dateKey, durationDays - 1) : dateKey,
               endTime: newTask.value.endTime || (() => {
                    const [h, m] = (newTask.value.time || '09:00').split(':').map(Number)
                    const endH = (h + 1) % 24
                    return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
               })()
          }

          if (editingTaskId.value) {
               store.updateTask(dateKey, {
                    id: editingTaskId.value,
                    ...taskPayload
               })
          } else {
               store.addTask(dateKey, taskPayload)
          }

          newTask.value = defaultNewTask()
          showAddForm.value = false
          editingTaskId.value = null
     }

     const handleEditTask = (task: any) => {
          editingTaskId.value = task.id
          newTask.value = {
               title: task.title,
               time: task.time || '09:00',
               endTime: task.endTime || (() => {
                    const [h, m] = (task.time || '09:00').split(':').map(Number)
                    const endH = (h + 1) % 24
                    return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
               })(),
               description: task.description || '',
               completed: task.completed,
               meetingType: task.meetingType || 'none',
               meetingUrl: task.meetingUrl || '',
               guestEmailsText: (task.guestEmails || []).join(', '),
               durationDays: task.durationDays || 1,
               useTimeRange: true
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
