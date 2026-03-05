import { createRouter, createWebHistory } from 'vue-router'

const routes = [
     {
          path: '/',
          name: 'Home',
          component: () => import('../pages/HomePage.vue')
     },
     {
          path: '/board',
          name: 'Board',
          component: () => import('../pages/BoardPage.vue')
     },
     {
          path: '/calendar',
          name: 'Calendar',
          component: () => import('../pages/CalendarPage.vue')
     },
     // ── Blog routes (static paths BEFORE dynamic :id) ────────────────────────
     {
          path: '/blogs',
          name: 'PublicBlogs',
          component: () => import('../pages/BlogPublicPage.vue')
     },
     {
          path: '/blogs/my',
          name: 'MyBlogs',
          component: () => import('../pages/MyBlogsPage.vue')
     },
     {
          path: '/blogs/create',
          name: 'BlogCreate',
          component: () => import('../pages/BlogCreatePage.vue')
     },
     {
          path: '/blogs/edit/:id',
          name: 'BlogEdit',
          component: () => import('../pages/BlogCreatePage.vue')
     },
     {
          path: '/blogs/:id',
          name: 'BlogView',
          component: () => import('../pages/BlogViewPage.vue')
     }
]

const router = createRouter({
     history: createWebHistory(),
     routes,
     scrollBehavior: () => ({ top: 0 })
})

export default router
