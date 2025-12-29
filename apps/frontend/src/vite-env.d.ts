/// <reference types="vite/client" />

import { Buffer } from 'buffer';

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Buffer polyfill for music-metadata-browser
declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}
