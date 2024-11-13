import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Forces all chunks into a single file named 'index.js'
        manualChunks: undefined, // Disables code splitting
        entryFileNames: 'index.js', // Specifies the entry file name
        chunkFileNames: 'index.js', // Ensures any chunk files are also named 'index.js'
        assetFileNames: 'index.[ext]', // Ensures asset files (CSS, etc.) have consistent naming
      }
    }
  }
})
