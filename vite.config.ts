import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // @ を src に向ける
      '@': path.resolve(__dirname, './src'),
    },
  },

  // 生の文字列として読み込むファイルの種類（.css・.tsx・.ts は加えない）
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
