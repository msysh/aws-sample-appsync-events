/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPSYNC_HTTP_ENDPOINT: string
  readonly VITE_APPSYNC_REALTIME_ENDPOINT: string
  readonly VITE_APPSYNC_API_KEY: string
  readonly VITE_APPSYNC_CHANNEL_NAMESPACE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}