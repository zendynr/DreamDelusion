import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate React and ReactDOM into their own chunk
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Separate Firebase into its own chunk (it's quite large)
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            // Other node_modules can stay together or be split further if needed
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit slightly, but we're still optimizing
    chunkSizeWarningLimit: 600,
  },
})



