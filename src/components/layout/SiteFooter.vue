<script setup lang="ts">
import { site } from '../../content/site'
import { t } from '../../i18n'
import Wordmark from '../brand/Wordmark.vue'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer theme-light">
    <div class="wrap footer__inner">
      <p class="footer__brand"><Wordmark /></p>
      <p class="footer__lines">© {{ year }} {{ site.name }}</p>
      <div class="footer__nav">
        <a class="text-link" href="#conteudo">{{ t('footer.top') }}</a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/*
 * O rodapé continua a luz do amanhecer, sem linha separando: começa na cor exata em
 * que o céu termina e segue clareando no mesmo sentido (nunca volta a escurecer).
 */
.footer {
  padding: 1rem 0 3rem;
  background: linear-gradient(180deg, var(--b-dawn-footer), #fcf6e8);
}

.footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem 3rem;
}

.footer__brand {
  font-size: 1.6rem;
  font-weight: 300;
}

.footer__lines {
  font-size: var(--text-xs);
  color: var(--fg-2);
}

.footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  font-size: var(--text-sm);
}

.footer__nav a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
}
</style>
