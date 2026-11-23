import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // This app is deployed at the domain root. Keep generated asset URLs rooted
  // at / instead of inheriting a stale repository/project subpath.
  base: '/',
  plugins: [react()],
})
