import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@unocss/reset/tailwind.css'
import 'uno.css'
import App from './App.vue'
import vue3GoogleLogin from 'vue3-google-login'

const app = createApp(App)
app.use(createPinia())
app.use(vue3GoogleLogin, {
     clientId: "486721954476-uiqegg4ubonatrjs3ul3savavkdaa0fl.apps.googleusercontent.com",
})
app.mount('#app')
