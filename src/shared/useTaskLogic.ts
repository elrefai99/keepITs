import { ref, computed } from 'vue'
import { formatDate, getMinutesFromTime, getCurrentTimeString, isDateDisabled } from '../utils/dateUtils'

export function useTaskLogic(store: any, selectedDate: any, todayFormatted: any, currentTime: any) {
     const showAddForm = ref(false)
     const editingTaskId = ref<string | null>(null)
     const showTodoList = ref(true)
     const newTask = ref<any>({
          title: '',
          time: '09:00',
          endTime: '10:00',
          description: '',
          completed: false,
          meetingType: 'none',
          meetingUrl: '',
          guestEmailsText: ''
     })

     // Get current tasks for selected date
     const currentTasks = computed(() => {
          if (!selectedDate.value) return []
          const dateKey = formatDate(selectedDate.value)
          const tasks = store.getTasksForDate(dateKey)
          // Sort by order first, then by time
          return tasks.sort((a: any, b: any) => {
               if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order
               }
               return a.time.localeCompare(b.time)
          })
     })

     // Categorize tasks for todo list
     const categorizedTasks = computed(() => {
          if (!selectedDate.value) return { workedOn: [], willStart: [], ended: [] }

          const dateKey = formatDate(selectedDate.value)
          const isToday = dateKey === todayFormatted.value
          const tasks = currentTasks.value
          // Use currentTime from ref passed in
          const currentTimeStr = getCurrentTimeString(currentTime.value)
          const currentMinutes = getMinutesFromTime(currentTimeStr)

          const workedOn: any[] = []
          const willStart: any[] = []
          const ended: any[] = []

          tasks.forEach((task: any) => {
               const startMinutes = getMinutesFromTime(task.time)
               // Default duration 1 hour if endTime not present
               const endMinutes = task.endTime ? getMinutesFromTime(task.endTime) : startMinutes + 60

               if (task.completed) {
                    ended.push(task)
               } else if (isToday) {
                    // Check range
                    if (currentMinutes > endMinutes) {
                         ended.push(task)
                    } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                         workedOn.push(task)
                    } else {
                         willStart.push(task)
                    }
               } else {
                    // For future dates, all non-completed tasks are "will start"
                    willStart.push(task)
               }
          })

          return { workedOn, willStart, ended }
     })

     // Get next upcoming task for today
     const nextTask = computed(() => {
          const dateKey = todayFormatted.value
          const tasks = store.getTasksForDate(dateKey)
               .filter((task: any) => !task.completed)
               .sort((a: any, b: any) => a.time.localeCompare(b.time))

          const currentTimeStr = getCurrentTimeString(currentTime.value)
          return tasks.find((task: any) => task.time > currentTimeStr) || null
     })

     // Get current active task (task whose time has started but not yet completed)
     const currentActiveTask = computed(() => {
          const dateKey = todayFormatted.value
          const tasks = store.getTasksForDate(dateKey)
               .filter((task: any) => !task.completed)
               .sort((a: any, b: any) => a.time.localeCompare(b.time))

          const currentTimeStr = getCurrentTimeString(currentTime.value)
          const currentMinutes = getMinutesFromTime(currentTimeStr)

          // Find task where current time is within range
          return tasks.find((task: any) => {
               const startMinutes = getMinutesFromTime(task.time)
               const endMinutes = task.endTime ? getMinutesFromTime(task.endTime) : startMinutes + 60
               return currentMinutes >= startMinutes && currentMinutes <= endMinutes
          }) || null
     })

     // Auto-complete tasks when their time has passed
     const checkAndCompletePassedTasks = () => {
          const dateKey = todayFormatted.value
          const tasks = store.getTasksForDate(dateKey)
          const currentTimeStr = getCurrentTimeString(currentTime.value)
          const currentMinutes = getMinutesFromTime(currentTimeStr)

          tasks.forEach((task: any) => {
               if (!task.completed) {
                    const startMinutes = getMinutesFromTime(task.time)
                    const endMinutes = task.endTime ? getMinutesFromTime(task.endTime) : startMinutes + 60

                    // Auto-complete if time is past end time + buffer (e.g. 1 minute)
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

          if (editingTaskId.value) {
               // Update existing task
               store.updateTask(dateKey, {
                    id: editingTaskId.value,
                    ...newTask.value,
                    guestEmails: guests,
                    endTime: newTask.value.endTime || (() => {
                         const [h, m] = newTask.value.time.split(':').map(Number)
                         const endH = (h + 1) % 24
                         return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                    })()
               })
          } else {
               // Create new task
               store.addTask(dateKey, {
                    ...newTask.value,
                    guestEmails: guests,
                    // Ensure endTime is set, default to 1 hour after time if needed
                    endTime: newTask.value.endTime || (() => {
                         const [h, m] = newTask.value.time.split(':').map(Number)
                         const endH = (h + 1) % 24
                         return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                    })()
               })
          }

          newTask.value = {
               title: '',
               time: '09:00',
               endTime: '10:00',
               description: '',
               completed: false,
               meetingType: 'none',
               meetingUrl: '',
               guestEmailsText: ''
          }
          showAddForm.value = false
          editingTaskId.value = null
     }

     const handleEditTask = (task: any) => {
          editingTaskId.value = task.id
          newTask.value = {
               title: task.title,
               time: task.time,
               endTime: task.endTime || (() => {
                    const [h, m] = task.time.split(':').map(Number)
                    const endH = (h + 1) % 24
                    return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
               })(),
               description: task.description || '',
               completed: task.completed,
               meetingType: task.meetingType || 'none',
               meetingUrl: task.meetingUrl || '',
               guestEmailsText: (task.guestEmails || []).join(', ')
          }
          showAddForm.value = true
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
