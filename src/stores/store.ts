import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { saveTask, getTasksForDate, deleteTask as deleteTaskFromFirebase, getAllUserTasks, addDaysToDate } from '../firebase/tasks'

export const useScheduleStore = defineStore('schedule', {
     state: () => ({
          schedules: {} as Record<string, any[]>,
          loading: false,
          synced: false
     }),

     getters: {
          getTasksForDate: (state) => (dateKey: string) => {
               return state.schedules[dateKey] || []
          },

          /** Returns all tasks that span across a given date (multi-day tasks included) */
          getTasksSpanningDate: (state) => (dateKey: string) => {
               const results: any[] = []
               const allDates = Object.keys(state.schedules)
               for (const dk of allDates) {
                    for (const task of state.schedules[dk]) {
                         // already stored on this date
                         if (dk === dateKey) {
                              if (!results.find(t => t.id === task.id)) results.push(task)
                              continue
                         }
                         // multi-day: startDate <= dateKey <= endDate
                         if (task.startDate && task.endDate && task.durationDays && task.durationDays > 1) {
                              if (task.startDate <= dateKey && task.endDate >= dateKey) {
                                   if (!results.find(t => t.id === task.id)) results.push(task)
                              }
                         }
                    }
               }
               return results
          },

          /**
           * Returns effective {time, endTime} for a task on a specific date.
           * Multi-day tasks can have per-day overrides in dailyTimes.
           */
          getTaskTimeForDate: () => (task: any, dateKey: string): { time: string; endTime: string } => {
               if (task.durationDays && task.durationDays > 1 && task.dailyTimes?.[dateKey]) {
                    return {
                         time: task.dailyTimes[dateKey].time || '09:00',
                         endTime: task.dailyTimes[dateKey].endTime || '10:00'
                    }
               }
               return {
                    time: task.time || '09:00',
                    endTime: task.endTime || '10:00'
               }
          }
     },

     actions: {
          async loadUserTasks() {
               const authStore = useAuthStore()
               if (!authStore.user) return

               try {
                    this.loading = true
                    const tasks = await getAllUserTasks(authStore.user.uid)

                    this.schedules = {}
                    tasks.forEach((task: any) => {
                         if (!this.schedules[task.date]) {
                              this.schedules[task.date] = []
                         }
                         if (task.order === undefined) {
                              task.order = this.schedules[task.date].length
                         }
                         this.schedules[task.date].push(task)
                    })

                    // Sort tasks by time (AM first → PM last), no-time tasks go to end
                    Object.keys(this.schedules).forEach(dateKey => {
                         this.schedules[dateKey].sort((a, b) => {
                              const ta = a.time || '99:99'
                              const tb = b.time || '99:99'
                              return ta.localeCompare(tb)
                         })
                    })

                    this.synced = true
               } catch (error) {
                    console.error('Error loading tasks:', error)
               } finally {
                    this.loading = false
               }
          },

          async loadTasksForDate(dateKey: string) {
               const authStore = useAuthStore()
               if (!authStore.user) return

               try {
                    const tasks = await getTasksForDate(authStore.user.uid, dateKey)
                    this.schedules[dateKey] = tasks
               } catch (error) {
                    console.error('Error loading tasks for date:', error)
               }
          },

          async addTask(dateKey: string, task: any) {
               const authStore = useAuthStore()

               // Calculate endDate from durationDays
               const durationDays = task.durationDays || 1
               const startDate = dateKey
               const endDate = durationDays > 1
                    ? addDaysToDate(startDate, durationDays - 1)
                    : startDate

               const newTask = {
                    id: Date.now().toString(),
                    ...task,
                    date: dateKey,
                    startDate,
                    endDate,
                    durationDays,
                    order: (this.schedules[dateKey]?.length || 0)
               }

               if (!this.schedules[dateKey]) {
                    this.schedules[dateKey] = []
               }
               // Insert at position 0 so new task shows at the top of today's tasks
               this.schedules[dateKey].unshift(newTask)

               // Re-assign order values after unshift
               this.schedules[dateKey].forEach((t, i) => { t.order = i })

               if (authStore.user) {
                    try {
                         const { date, userId, ...taskToSave } = newTask as any
                         await saveTask(authStore.user.uid, dateKey, taskToSave)
                    } catch (error) {
                         console.error('Error saving task to Firebase:', error)
                    }
               }
          },

          async updateTask(dateKey: string, task: any) {
               const authStore = useAuthStore()

               if (this.schedules[dateKey]) {
                    const index = this.schedules[dateKey].findIndex(t => t.id === task.id)
                    if (index !== -1) {
                         // Recalculate endDate if durationDays changed
                         const durationDays = task.durationDays || this.schedules[dateKey][index].durationDays || 1
                         const startDate = task.startDate || dateKey
                         const endDate = durationDays > 1
                              ? addDaysToDate(startDate, durationDays - 1)
                              : startDate

                         const updatedTask = {
                              ...this.schedules[dateKey][index],
                              ...task,
                              durationDays,
                              endDate
                         }
                         this.schedules[dateKey][index] = updatedTask

                         if (authStore.user) {
                              try {
                                   const { date, userId, ...taskToSave } = updatedTask
                                   await saveTask(authStore.user.uid, dateKey, taskToSave)
                              } catch (error) {
                                   console.error('Error updating task in Firebase:', error)
                              }
                         }
                    }
               }
          },

          async toggleTaskComplete(dateKey: string, taskId: string) {
               const authStore = useAuthStore()

               const tasks = this.schedules[dateKey]
               if (tasks) {
                    const task = tasks.find(t => t.id === taskId)
                    if (task) {
                         task.completed = !task.completed

                         if (authStore.user) {
                              try {
                                   await saveTask(authStore.user.uid, dateKey, task)
                              } catch (error) {
                                   console.error('Error updating task in Firebase:', error)
                              }
                         }
                    }
               }
          },

          async deleteTask(dateKey: string, taskId: string) {
               const authStore = useAuthStore()

               if (this.schedules[dateKey]) {
                    const taskToDelete = this.schedules[dateKey].find(t => t.id === taskId)

                    this.schedules[dateKey] = this.schedules[dateKey].filter(
                         task => task.id !== taskId
                    )

                    if (authStore.user) {
                         try {
                              await deleteTaskFromFirebase(authStore.user.uid, dateKey, taskId)
                         } catch (error) {
                              console.error('Error deleting task from Firebase:', error)
                              if (taskToDelete) {
                                   this.schedules[dateKey].push(taskToDelete)
                              }
                         }
                    }
               }
          },

          async reorderTasks(dateKey: string, taskIds: string[]) {
               const authStore = useAuthStore()

               if (!this.schedules[dateKey]) return

               const tasksMap = new Map(this.schedules[dateKey].map(t => [t.id, t]))
               const reorderedTasks = taskIds
                    .map(id => tasksMap.get(id))
                    .filter(Boolean) as any[]

               reorderedTasks.forEach((task, index) => {
                    task.order = index
               })

               this.schedules[dateKey] = reorderedTasks

               if (authStore.user) {
                    try {
                         await Promise.all(
                              reorderedTasks.map(task => {
                                   const { date, userId, ...taskToSave } = task
                                   return saveTask(authStore.user!.uid, dateKey, taskToSave)
                              })
                         )
                    } catch (error) {
                         console.error('Error reordering tasks in Firebase:', error)
                    }
               }
          }
     }
})
