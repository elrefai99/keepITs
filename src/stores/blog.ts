import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import {
     saveBlog,
     getUserBlogs,
     deleteBlog as deleteBlogFromFirebase,
     type Blog
} from '../firebase/blogs'

export const useBlogStore = defineStore('blog', () => {
     const userBlogs = ref<Blog[]>([])
     const loading = ref(false)
     const error = ref<string | null>(null)

     const authStore = useAuthStore()

     /** Load all blogs for the current user */
     async function loadUserBlogs() {
          if (!authStore.user) return
          loading.value = true
          error.value = null
          try {
               userBlogs.value = await getUserBlogs(authStore.user.uid)
          } catch (e: any) {
               error.value = e.message
          } finally {
               loading.value = false
          }
     }

     /** Create or update a blog */
     async function upsertBlog(blog: Omit<Blog, 'userId' | 'authorName' | 'authorPhoto'>): Promise<Blog> {
          if (!authStore.user) throw new Error('Not authenticated')
          loading.value = true
          error.value = null
          try {
               const fullBlog: Omit<Blog, 'createdAt' | 'updatedAt'> = {
                    ...blog,
                    userId: authStore.user.uid,
                    authorName: authStore.user.displayName || authStore.user.email || 'Anonymous',
                    // Only include authorPhoto when it exists — Firestore rejects undefined
                    ...(authStore.user.photoURL ? { authorPhoto: authStore.user.photoURL } : {})
               }
               const saved = await saveBlog(fullBlog)
               // Update local list
               const idx = userBlogs.value.findIndex(b => b.id === saved.id)
               if (idx !== -1) {
                    userBlogs.value[idx] = saved
               } else {
                    userBlogs.value.unshift(saved)
               }
               return saved
          } catch (e: any) {
               error.value = e.message
               throw e
          } finally {
               loading.value = false
          }
     }

     /** Delete a blog */
     async function deleteBlog(blogId: string) {
          loading.value = true
          try {
               await deleteBlogFromFirebase(blogId)
               userBlogs.value = userBlogs.value.filter(b => b.id !== blogId)
          } catch (e: any) {
               error.value = e.message
               throw e
          } finally {
               loading.value = false
          }
     }

     return { userBlogs, loading, error, loadUserBlogs, upsertBlog, deleteBlog }
})
