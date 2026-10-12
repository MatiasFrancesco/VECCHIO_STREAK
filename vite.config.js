import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev:https` serve in HTTPS: necessario per microfono e GPS quando si apre l'app dal telefono in LAN.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: { port: 5173 },
}))
