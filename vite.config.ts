import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { scoreApiPlugin } from './vite-plugin-score.ts'

export default defineConfig({
  plugins: [react(), scoreApiPlugin()],
})
