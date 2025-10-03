import { defineConfig } from 'vite'
import eslintPlugin from 'vite-plugin-eslint'
import path from 'path'

// vite.config.js
export default defineConfig(({ command }) => ({
  plugins: [eslintPlugin({ cache: false })],
  optimizeDeps: {
    exclude: ['aurora.js', 'twilightFringe.js', 'energy.js'],
  },
  server: {
    host: 'localhost',
    port: 3000,
    cors: '*',
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },
  build:
    command === 'build'
      ? {
          minify: true,
          manifest: true,
          lib: {
            entry: path.resolve(__dirname, 'src/main.js'),
            name: 'Main',
            formats: ['umd'],
            fileName: () => 'main.js',
          },
          rollupOptions: {
            external: ['jquery'],
            output: {
              globals: {
                jquery: '$',
              },
              inlineDynamicImports: true,
              esModule: false,
              compact: true,
            },
          },
        }
      : {},
  resolve: {
    alias: [
      {
        find: /^three$/,
        replacement: path.resolve(
          __dirname,
          'node_modules/three/build/three.module.js'
        ),
      },
    ],
  },
  assetsInclude: ['**/*.riv'],
}))
