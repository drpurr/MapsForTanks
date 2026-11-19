import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { dataPlugin } from './plugins/data.ts'
import { editorPlugin } from './plugins/editor.ts'

// editorPlugin is `apply: 'serve'`: it only exists under `vite dev`.
export default defineConfig({
  base: './',
  publicDir: 'public',
  plugins: [react(), dataPlugin(), editorPlugin()],
})
