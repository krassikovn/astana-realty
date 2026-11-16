import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base './' — чтобы собранный сайт работал из любой папки хостинга (например, GitHub Pages: user.github.io/repo/)
export default defineConfig({ base: './', plugins: [react()], server: { port: 5177, open: false }, build: { chunkSizeWarningLimit: 2000 } })
