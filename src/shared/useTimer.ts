import { ref, computed } from 'vue'
import { getMinutesFromTime } from '../utils/dateUtils'

export function useTimer(currentActiveTask: any, onTimerComplete: () => void) {
     const timerMinutes = ref(50)
     const timerSeconds = ref(0)
     const isTimerRunning = ref(false)
     const isBreakTime = ref(false)
     const timerInterval = ref<any>(null)

     const pauseTimer = () => {
          isTimerRunning.value = false
          if (timerInterval.value) {
               clearInterval(timerInterval.value)
               timerInterval.value = null
          }
     }

     const stopTimer = () => {
          pauseTimer()
          isBreakTime.value = !isBreakTime.value
          if (isBreakTime.value) {
               timerMinutes.value = 10
          } else {
               timerMinutes.value = 50
          }
          timerSeconds.value = 0
     }

     const resetTimer = () => {
          pauseTimer()
          if (isBreakTime.value) {
               timerMinutes.value = 10
          } else {
               timerMinutes.value = 50
          }
          timerSeconds.value = 0
     }

     const startTimer = () => {
          if (isTimerRunning.value) return

          // Sync timer duration with active task end time if available
          if (!isBreakTime.value && currentActiveTask && currentActiveTask.value) {
               const now = new Date()
               const currentHours = now.getHours()
               const currentMinutes = now.getMinutes()
               const currentSeconds = now.getSeconds()

               const currentTotalMinutes = currentHours * 60 + currentMinutes

               const task = currentActiveTask.value
               const startTotalMinutes = getMinutesFromTime(task.time)
               const endTotalMinutes = task.endTime ? getMinutesFromTime(task.endTime) : startTotalMinutes + 60

               let remainingMinutes = endTotalMinutes - currentTotalMinutes

               if (remainingMinutes > 0) {
                    if (currentSeconds > 0) {
                         timerMinutes.value = remainingMinutes - 1
                         timerSeconds.value = 60 - currentSeconds
                    } else {
                         timerMinutes.value = remainingMinutes
                         timerSeconds.value = 0
                    }
               }
          }

          isTimerRunning.value = true

          // Calculate target end time based on current timer values
          const targetTime = new Date().getTime() + (timerMinutes.value * 60 + timerSeconds.value) * 1000

          timerInterval.value = setInterval(() => {
               const now = new Date().getTime()
               const remainingMs = targetTime - now

               if (remainingMs <= 0) {
                    timerMinutes.value = 0
                    timerSeconds.value = 0
                    stopTimer()
                    onTimerComplete()
                    return
               }

               const totalSecondsLeft = Math.ceil(remainingMs / 1000)
               timerMinutes.value = Math.floor(totalSecondsLeft / 60)
               timerSeconds.value = totalSecondsLeft % 60
          }, 1000)
     }

     const timerDisplay = computed(() => {
          const mins = String(timerMinutes.value).padStart(2, '0')
          const secs = String(timerSeconds.value).padStart(2, '0')
          return `${mins}:${secs}`
     })

     return {
          timerMinutes,
          timerSeconds,
          isTimerRunning,
          isBreakTime,
          timerDisplay,
          startTimer,
          pauseTimer,
          resetTimer,
          stopTimer
     }
}
