import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Forces all chunks into a single file named 'index.js'
        manualChunks: undefined, // Disables code splitting
        entryFileNames: 'iframe.js', // Specifies the entry file name
        chunkFileNames: 'iframe.js', // Ensures any chunk files are also named 'iframe.js'
        assetFileNames: 'iframe.[ext]', // Ensures asset files (CSS, etc.) have consistent naming
      }
    }
  }
})
