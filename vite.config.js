import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // Fixed the name here!

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  define: {
    // This is the "Magic Fix" for using 'Buffer' in Vite/Browser
    global: 'window', 
  },
})