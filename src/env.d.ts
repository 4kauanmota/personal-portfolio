/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

/** Imagens de src/assets/projects, por nome do repositório (gerado pelo plugin em scripts/vite). */
declare module 'virtual:project-images' {
  const images: Record<string, import('./lib/types').ProjectImage>
  export default images
}
