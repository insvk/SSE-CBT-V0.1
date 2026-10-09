import { defineConfig, Plugin } from 'vite'
import { resolve } from 'path'

function rootRedirectPlugin(): Plugin {
  return {
    name: 'root-redirect-plugin',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '') {
          req.url = '/index.html'
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [rootRedirectPlugin()],
  server: {
    port: 5173,
    open: false
  },
  build: {
    rollupOptions: {
      input: {
        main:                resolve(__dirname, 'index.html'),
        login:               resolve(__dirname, 'login.html'),
        admin:               resolve(__dirname, 'admin.html'),
        candidate_dashboard: resolve(__dirname, 'candidate_dashboard.html'),
        exam:                resolve(__dirname, 'exam.html'),
        instructions:        resolve(__dirname, 'instructions.html'),
        scorecard:           resolve(__dirname, 'scorecard.html'),
        question_bank:       resolve(__dirname, 'question_bank.html'),
      }
    }
  }
})
