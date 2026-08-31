/**
 * 前端入口
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vue3TreeOrg from 'vue3-tree-org'
import 'vue3-tree-org/lib/vue3-tree-org.css'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(vue3TreeOrg)
app.mount('#app')
