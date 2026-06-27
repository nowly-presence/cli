import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  shims: true,
  splitting: false,
  treeshake: true,
  minify: false,
  sourcemap: false,
  target: 'node22',
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
    }
  },
})
