import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/microbit-ai-project1/',
  plugins: [react()],
});
