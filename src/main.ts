import '@fontsource-variable/jost/wght.css'
import '@fontsource/spectral/400.css'
import '@fontsource/spectral/400-italic.css'
import '@fontsource/spectral/500.css'
import '@fontsource/nanum-pen-script/latin-400.css'
import './styles/tokens.css'
import './styles/base.css'

import { createApp } from 'vue'
import App from './App.vue'
import { vReveal } from './directives/reveal'
import { syncInitialUrl } from './i18n'

syncInitialUrl()
createApp(App).directive('reveal', vReveal).mount('#app')
