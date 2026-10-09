import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:          resolve(__dirname, 'index.html'),
        login:         resolve(__dirname, 'login.html'),
        admin:         resolve(__dirname, 'admin.html'),
        exam:          resolve(__dirname, 'exam.html'),
        instructions:  resolve(__dirname, 'instructions.html'),
        scorecard:     resolve(__dirname, 'scorecard.html'),
        question_bank: resolve(__dirname, 'question_bank.html'),
      }
    }
  }
})
