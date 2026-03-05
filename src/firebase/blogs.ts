import {
     collection,
     doc,
     setDoc,
     getDoc,
     getDocs,
     deleteDoc,
     query,
     where,
     orderBy,
     serverTimestamp,
     limit,
     startAfter,
     type QueryDocumentSnapshot
} from 'firebase/firestore'
import { db } from './config'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BlogBlock {
     id: string
     type: 'text' | 'image'
     content: string   // text content OR cloudinary image URL
     caption?: string  // optional caption for in-blog images
}

export interface Blog {
     id: string
     title: string
     mainImage?: string       // cloudinary URL (optional)
     blocks: BlogBlock[]      // ordered content blocks (text + images)
     status: 'draft' | 'public'
     userId: string
     authorName: string
     authorPhoto?: string
     createdAt?: any
     updatedAt?: any
     tags?: string[]
     excerpt?: string         // auto-derived from first text block
}

// ── Cloudinary Upload ──────────────────────────────────────────────────────────

export async function uploadToCloudinary(file: File): Promise<string> {
     const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
     const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

     if (!cloudName || !uploadPreset) {
          throw new Error('Cloudinary env vars missing: VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET')
     }

     const formData = new FormData()
     formData.append('file', file)
     formData.append('upload_preset', uploadPreset)
     formData.append('folder', 'keepits/blogs')

     const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
     })

     if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error?.message || 'Cloudinary upload failed')
     }

     const data = await res.json()
     return data.secure_url as string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Remove keys whose value is undefined — Firestore rejects undefined fields */
function stripUndefined<T extends Record<string, any>>(obj: T): T {
     return Object.fromEntries(
          Object.entries(obj).filter(([, v]) => v !== undefined)
     ) as T
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

/** Save (create or update) a blog */
export async function saveBlog(blog: Omit<Blog, 'createdAt' | 'updatedAt'>): Promise<Blog> {
     const blogRef = doc(db, 'blogs', blog.id)
     const existing = await getDoc(blogRef)

     // Auto-derive excerpt from first text block
     const firstTextBlock = blog.blocks.find(b => b.type === 'text')
     const excerpt = firstTextBlock
          ? firstTextBlock.content.replace(/<[^>]+>/g, '').slice(0, 200)
          : ''

     // Strip undefined before spreading — Firestore rejects undefined values
     const cleaned = stripUndefined({ ...blog })

     const blogData: any = {
          ...cleaned,
          excerpt,
          updatedAt: serverTimestamp()
     }

     if (!existing.exists()) {
          blogData.createdAt = serverTimestamp()
     }

     await setDoc(blogRef, blogData, { merge: true })
     return blogData as Blog
}

/** Get a single blog by id */
export async function getBlog(blogId: string): Promise<Blog | null> {
     const blogRef = doc(db, 'blogs', blogId)
     const snap = await getDoc(blogRef)
     if (!snap.exists()) return null
     return { id: snap.id, ...snap.data() } as Blog
}

/** Get all blogs for the authenticated user */
export async function getUserBlogs(userId: string): Promise<Blog[]> {
     const q = query(
          collection(db, 'blogs'),
          where('userId', '==', userId)
          // No orderBy here — avoids needing a composite index; we sort client-side below
     )
     const snap = await getDocs(q)
     const blogs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Blog)
     // Sort by createdAt descending client-side
     return blogs.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? a.createdAt ?? 0
          const tb = b.createdAt?.toMillis?.() ?? b.createdAt ?? 0
          return tb - ta
     })
}

/** Get public blogs with pagination */
export async function getPublicBlogs(
     pageSize: number,
     lastDoc?: QueryDocumentSnapshot
): Promise<{ blogs: Blog[]; lastDoc: QueryDocumentSnapshot | null }> {
     let q = query(
          collection(db, 'blogs'),
          where('status', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
     )

     if (lastDoc) {
          q = query(
               collection(db, 'blogs'),
               where('status', '==', 'public'),
               orderBy('createdAt', 'desc'),
               startAfter(lastDoc),
               limit(pageSize)
          )
     }

     const snap = await getDocs(q)
     const blogs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Blog)
     const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
     return { blogs, lastDoc: last }
}

/** Search public blogs by title */
export async function searchPublicBlogs(searchTerm: string): Promise<Blog[]> {
     // Firestore doesn't support full-text search natively; use client-side filter
     const q = query(
          collection(db, 'blogs'),
          where('status', '==', 'public'),
          orderBy('createdAt', 'desc')
     )
     const snap = await getDocs(q)
     const all = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Blog)
     const term = searchTerm.toLowerCase()
     return all.filter(b =>
          b.title.toLowerCase().includes(term) ||
          (b.excerpt || '').toLowerCase().includes(term)
     )
}

/** Delete a blog */
export async function deleteBlog(blogId: string): Promise<void> {
     await deleteDoc(doc(db, 'blogs', blogId))
}
