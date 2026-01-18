import { ref } from 'vue'
import { getCurrentTimeString, formatDate } from '../utils/dateUtils'

export function useNotifications(store: any, todayFormatted: any, isBreakTime: any) {
     const notifiedTasks = ref<Set<string>>(new Set())
     const lastBreakNotification = ref<number>(0)

     // Create audio context for notification sounds
     const playNotificationSound = (type: 'break' | 'task' = 'task') => {
          try {
               const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
               if (!AudioContextClass) return

               const audioContext = new AudioContextClass()
               const oscillator = audioContext.createOscillator()
               const gainNode = audioContext.createGain()

               oscillator.connect(gainNode)
               gainNode.connect(audioContext.destination)

               if (type === 'break') {
                    // Break sound: two-tone chime
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
                    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
                    oscillator.start(audioContext.currentTime)
                    oscillator.stop(audioContext.currentTime + 0.5)
               } else {
                    // Task start sound: gentle beep
                    oscillator.frequency.setValueAtTime(600, audioContext.currentTime)
                    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
                    oscillator.start(audioContext.currentTime)
                    oscillator.stop(audioContext.currentTime + 0.3)
               }
          } catch (error) {
               console.warn('Could not play notification sound:', error)
          }
     }

     const showNotification = () => {
          const now = Date.now()
          // Prevent duplicate notifications within 2 seconds
          if (now - lastBreakNotification.value < 2000) return

          lastBreakNotification.value = now

          const message = isBreakTime.value
               ? '🎉 Break time is over! Ready to get back to work?'
               : '⏰ Time for a break! You\'ve completed 50 minutes of focused work.'

          // Play notification sound
          playNotificationSound('break')

          if ('Notification' in window && Notification.permission === 'granted') {
               new Notification('Schedule Manager', { body: message })
          } else if ('Notification' in window && Notification.permission !== 'denied') {
               Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                         new Notification('Schedule Manager', { body: message })
                    }
               })
          }

          alert(message)
     }

     // Check for upcoming tasks and play notification
     const checkUpcomingTasks = () => {
          const dateKey = todayFormatted.value
          const tasks = store.getTasksForDate(dateKey)
               .filter((task: any) => !task.completed)
               .sort((a: any, b: any) => a.time.localeCompare(b.time))

          if (tasks.length === 0) return

          const now = new Date()
          const currentTimeStr = getCurrentTimeString(now)
          const [currentHour, currentMin] = currentTimeStr.split(':').map(Number)
          const currentTotalMinutes = currentHour * 60 + currentMin

          tasks.forEach((task: any) => {
               // Skip if already notified
               if (notifiedTasks.value.has(task.id)) return

               const [taskHour, taskMin] = task.time.split(':').map(Number)
               const taskTotalMinutes = taskHour * 60 + taskMin

               // Play sound exactly when task time is reached
               if (taskTotalMinutes === currentTotalMinutes) {
                    playNotificationSound('task')
                    notifiedTasks.value.add(task.id)

                    // Show notification
                    const message = `⏰ Task starting now: ${task.title}`
                    if ('Notification' in window && Notification.permission === 'granted') {
                         new Notification('Schedule Manager', { body: message })
                    } else if ('Notification' in window && Notification.permission !== 'denied') {
                         Notification.requestPermission().then(permission => {
                              if (permission === 'granted') {
                                   new Notification('Schedule Manager', { body: message })
                              }
                         })
                    }
               }
          })
     }

     // Reset notified tasks at the start of each day
     const checkDayChange = () => {
          const todayKey = formatDate(new Date())
          const storedDay = localStorage.getItem('lastNotificationDay')

          if (storedDay !== todayKey) {
               notifiedTasks.value.clear()
               localStorage.setItem('lastNotificationDay', todayKey)
          }
     }

     return {
          notifiedTasks,
          playNotificationSound,
          showNotification,
          checkUpcomingTasks,
          checkDayChange
     }
}
