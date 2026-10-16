import type { PlatformId } from './platforms'

/**
 * Seus links, num lugar só. A seção "Links" e a página /links leem daqui,
 * na ordem desta lista. Só entram perfis confirmados. Para adicionar outro,
 * copie uma linha e troque a plataforma (veja as disponíveis em platforms.ts),
 * o endereço e o nome de usuário.
 */
export interface LinkEntry {
  platform: PlatformId
  url: string
  /** Como o perfil aparece na tela. */
  handle: string
}

export const links: LinkEntry[] = [
  { platform: 'github', url: 'https://github.com/4kauanmota', handle: '4kauanmota' },
  { platform: 'linkedin', url: 'https://www.linkedin.com/in/4kauanmota/', handle: 'in/4kauanmota' },
  { platform: 'pixelmole', url: 'https://pixelmole.com.br/members/4kauanmota', handle: '4kauanmota' },
  { platform: 'email', url: 'mailto:4kauanmota@gmail.com', handle: '4kauanmota@gmail.com' },
  // Exemplos (confirme o endereço antes de descomentar):
  // { platform: 'itch', url: 'https://4kauanmota.itch.io', handle: '4kauanmota' },
  // { platform: 'instagram', url: 'https://www.instagram.com/4kauanmota/', handle: '@4kauanmota' },
]
