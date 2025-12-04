import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['multiformats']
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [solid()]
  }
})
