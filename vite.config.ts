import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:8080'
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        // 后端所有业务路由均为 POST（RPC 风格），用正则一次性匹配
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')   // 去掉 /api 前缀
        },
        // 公开作品图（后端 /media，**不剥前缀**）：作品集封面/图集是站内相对路径，
        // 不代理的话 dev 下浏览器会去 devServer 找 /media → 404，上传后预览与卡片封面全空白
        '/media': {
          target: backendUrl,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900
    }
  }
})