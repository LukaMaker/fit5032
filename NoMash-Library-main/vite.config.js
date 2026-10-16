import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from /<repository-name>/.
  // GITHUB_PAGES is only set in the GitHub Actions workflow, so local dev
  // and the Cloudflare deployment keep using '/'.
  base: process.env.GITHUB_PAGES === 'true' ? '/lboskovic-library/' : '/',

  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
