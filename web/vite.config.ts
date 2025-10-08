import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8081'
    }
  },
  build: {
    outDir: 'dist'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('development')
  }

})
