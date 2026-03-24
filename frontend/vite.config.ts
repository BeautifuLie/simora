import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcssVite from '@tailwindcss/vite'; // <--- важно
import path from 'path';

export default defineConfig({
    plugins: [react(), tailwindcssVite()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
