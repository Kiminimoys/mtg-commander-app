import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Vérifier si les certificats SSL existent
const keyPath = path.resolve(__dirname, 'certs/key.pem')
const certPath = path.resolve(__dirname, 'certs/cert.pem')
const hasSSL = fs.existsSync(keyPath) && fs.existsSync(certPath)

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Écoute sur toutes les interfaces (accès réseau local)
    port: 5173,
    // HTTPS si les certificats existent
    ...(hasSSL && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    })
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
