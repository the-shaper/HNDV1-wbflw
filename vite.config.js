import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'

  return {
    base: isBuild ? 'https://twilight-fringe.vercel.app/' : '/',
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env': {},
    },
    server: {
      host: 'localhost',
      port: 3000,
      cors: '*',
      hmr: { host: 'localhost', protocol: 'ws' },
    },
    build: isBuild
      ? {
          target: 'esnext',
          outDir: 'dist',
          assetsDir: '',
          cssCodeSplit: true,
          // Library mode ensures an ES entry file at dist/main.js while keeping dynamic imports as chunks
          lib: {
            entry: path.resolve(__dirname, 'src/main.js'),
            formats: ['es'],
            fileName: () => 'main.js',
          },
          rollupOptions: {
            output: {
              format: 'es',
              entryFileNames: 'main.js',
              chunkFileNames: 'assets/[name]-[hash].js',
              assetFileNames: 'assets/[name]-[hash][extname]',
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
    optimizeDeps: {
      exclude: ['aurora.js', 'twilightFringe.js', 'energy.js'],
    },
  }
})
