import { defineConfig } from 'vite'
import type { PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT
const shouldUploadSourceMaps = Boolean(
  sentryAuthToken && sentryOrg && sentryProject,
)

function createPlugins(): PluginOption[] {
  const plugins: PluginOption[] = [react()]

  if (sentryAuthToken && sentryOrg && sentryProject) {
    plugins.push(sentryVitePlugin({
      authToken: sentryAuthToken,
      org: sentryOrg,
      project: sentryProject,
      telemetry: false,
      sourcemaps: {
        filesToDeleteAfterUpload: './dist/**/*.map',
      },
      release: {
        name: process.env.SENTRY_RELEASE,
      },
    }))
  }

  return plugins
}

// https://vite.dev/config/
export default defineConfig({
  plugins: createPlugins(),
  build: {
    sourcemap: shouldUploadSourceMaps ? 'hidden' : false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PROXY_TARGET ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
