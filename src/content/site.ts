/**
 * Identidade do site. Tudo que depende do seu nome de usuário sai daqui.
 */
export const site = {
  /** Identidade principal, usada no logotipo e nos links. */
  handle: '4kauanmota',
  /** Nome completo, usado nos metadados e no texto alternativo. */
  name: 'Kauan Soares Mota',
  /** Usuário do GitHub cujos repositórios públicos aparecem em Projetos. */
  githubUser: '4kauanmota',
  /**
   * Endereço público usado nas tags canônicas e de compartilhamento.
   * Pode ser sobrescrito pela variável de ambiente SITE_URL no build.
   */
  defaultUrl: 'https://4kauanmota.com.br',
  /**
   * Outros endereços onde este portfólio pode estar publicado (o da Vercel). Um link de
   * projeto que aponte para eles só some depois de a sincronização conferir que a página
   * publicada lá é mesmo este portfólio (hoje o endereço da Vercel ainda mostra o antigo).
   */
  otherUrls: ['https://4kauanmota.vercel.app'],
} as const
