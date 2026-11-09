import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet'],
          lucide: ['lucide-react']
        }
      }
    }
  },
  server: {
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/reports': 'http://127.0.0.1:8000',
      '/lookup': 'http://127.0.0.1:8000',
      '/map': 'http://127.0.0.1:8000',
      '/alerts': 'http://127.0.0.1:8000',
      '/challenges': 'http://127.0.0.1:8000',
      '/license': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/scan-screenshot': 'http://127.0.0.1:8000'
    }
  }
});
