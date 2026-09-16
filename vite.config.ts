import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 開発時(dev)は '/'、ビルド時(production)だけ '/Ticket-Manager/' にする
  base: process.env.NODE_ENV === 'production' ? '/Ticket-Manager/' : '/',
});