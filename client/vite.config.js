import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: mode === "development"
            ? "http://localhost:3032"
            : "http://backend:3032",
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/socket.io": {
          target: mode === "development"
            ? "http://localhost:3032"
            : "http://backend:3032",
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    build: {
      outDir: "dist",
    },
    plugins: [react()],
  }
})
