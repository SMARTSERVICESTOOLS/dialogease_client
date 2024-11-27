import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'iframe.js',
        chunkFileNames: 'iframe.js',
        assetFileNames: 'iframe.[ext]',
      }
    }
  }
})