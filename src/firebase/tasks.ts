import {
     collection,
     doc,
     setDoc,
     getDoc,
     getDocs,
     deleteDoc,
     query,
     where,
     serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

/** Default daily work time for multi-day tasks */
export const DEFAULT_TASK_START_TIME = '09:00'
export const DEFAULT_TASK_END_TIME = '10:00'

export interface Task {
     id: string
     title: string
     // Time fields (optional for all-day / multi-day tasks)
     time: string       // start time e.g. "09:00" — default for all days
     endTime?: string   // end time e.g. "10:00" — default for all days
     // Per-day time overrides for multi-day tasks: { "2026-03-01": { time: "10:00", endTime: "11:00" }, ... }
     dailyTimes?: Record<string, { time: string; endTime: string }>
     // Duration fields
     durationDays?: number   // number of days (1 = single day, 4 = 4 days)
     startDate: string       // YYYY-MM-DD  (primary date / anchor)
     endDate?: string        // YYYY-MM-DD  auto-calculated from startDate + durationDays
     description: string
     completed: boolean
     // Keep `date` as the primary Firestore lookup key (= startDate)
     date: string
     userId: string
     order?: number
     meetingType?: 'none' | 'google' | 'teams' | 'custom'
     meetingUrl?: string
     guestEmails?: string[]
     createdAt?: any
     updatedAt?: any
}

// ── helpers ────────────────────────────────────────────────────────────────────

/** Add N calendar days to a YYYY-MM-DD string and return the new string */
export const addDaysToDate = (dateStr: string, days: number): string => {
     const d = new Date(dateStr + 'T00:00:00')
     d.setDate(d.getDate() + days)
     const y = d.getFullYear()
     const m = String(d.getMonth() + 1).padStart(2, '0')
     const day = String(d.getDate()).padStart(2, '0')
     return `${y}-${m}-${day}`
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

/** Save (create or update) a task.  The Firestore document id is based on userId + startDate + taskId. */
export const saveTask = async (userId: string, dateKey: string, task: Omit<Task, 'userId' | 'date'>) => {
     try {
          const taskRef = doc(db, 'tasks', `${userId}_${dateKey}_${task.id}`)

          const taskData: Task = {
               ...task,
               date: dateKey,
               startDate: task.startDate || dateKey,
               userId,
               updatedAt: serverTimestamp()
          }

          const existingTask = await getDoc(taskRef)
          if (!existingTask.exists()) {
               taskData.createdAt = serverTimestamp()
          }

          await setDoc(taskRef, taskData, { merge: true })
          return taskData
     } catch (error) {
          console.error('Error saving task:', error)
          throw error
     }
}

/** Get all tasks for a user on a specific date (single-day query by `date` field) */
export const getTasksForDate = async (userId: string, dateKey: string): Promise<Task[]> => {
     try {
          const tasksRef = collection(db, 'tasks')
          const q = query(
               tasksRef,
               where('userId', '==', userId),
               where('date', '==', dateKey)
          )
          const querySnapshot = await getDocs(q)
          const tasks: Task[] = []
          querySnapshot.forEach((doc) => {
               tasks.push(doc.data() as Task)
          })
          return tasks
     } catch (error) {
          console.error('Error getting tasks:', error)
          throw error
     }
}

/** Delete task from Firestore */
export const deleteTask = async (userId: string, dateKey: string, taskId: string) => {
     try {
          const taskRef = doc(db, 'tasks', `${userId}_${dateKey}_${taskId}`)
          await deleteDoc(taskRef)
     } catch (error) {
          console.error('Error deleting task:', error)
          throw error
     }
}

/** Get ALL tasks for a user (used on initial load) */
export const getAllUserTasks = async (userId: string): Promise<Task[]> => {
     try {
          const tasksRef = collection(db, 'tasks')
          const q = query(tasksRef, where('userId', '==', userId))
          const querySnapshot = await getDocs(q)
          const tasks: Task[] = []
          querySnapshot.forEach((doc) => {
               tasks.push(doc.data() as Task)
          })
          return tasks
     } catch (error) {
          console.error('Error getting all tasks:', error)
          throw error
     }
}
