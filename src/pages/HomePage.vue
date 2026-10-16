<script setup lang="ts">
import AboutSection from '../components/about/AboutSection.vue'
import CuriositiesSection from '../components/curiosities/CuriositiesSection.vue'
import HeroSection from '../components/hero/HeroSection.vue'
import SiteFooter from '../components/layout/SiteFooter.vue'
import SiteHeader from '../components/layout/SiteHeader.vue'
import LinksSection from '../components/links/LinksSection.vue'
import ProjectsSection from '../components/projects/ProjectsSection.vue'
import TravelingSun from '../components/atmosphere/TravelingSun.vue'
</script>

<template>
  <SiteHeader />
  <main id="conteudo" tabindex="-1">
    <HeroSection />
    <ProjectsSection />
    <AboutSection />
    <CuriositiesSection />
    <LinksSection />
    <!-- Depois das seções: o sol passa por cima dos céus de todas elas e atrás de todo o conteúdo. -->
    <TravelingSun />
  </main>
  <SiteFooter />
</template>
