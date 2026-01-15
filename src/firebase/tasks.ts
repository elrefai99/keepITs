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

export interface Task {
     id: string
     title: string
     time: string
     description: string
     completed: boolean
     date: string
     userId: string
     meetingType?: 'none' | 'google' | 'teams' | 'custom'
     meetingUrl?: string
     guestEmails?: string[]
     createdAt?: any
     updatedAt?: any
}

// Save task to Firestore
export const saveTask = async (userId: string, dateKey: string, task: Omit<Task, 'userId' | 'date'>) => {
     try {
          const taskRef = doc(db, 'tasks', `${userId}_${dateKey}_${task.id}`)

          const taskData: Task = {
               ...task,
               date: dateKey,
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

// Get all tasks for a user on a specific date
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

// Delete task from Firestore
export const deleteTask = async (userId: string, dateKey: string, taskId: string) => {
     try {
          const taskRef = doc(db, 'tasks', `${userId}_${dateKey}_${taskId}`)
          await deleteDoc(taskRef)
     } catch (error) {
          console.error('Error deleting task:', error)
          throw error
     }
}

// Get all tasks for a user
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
