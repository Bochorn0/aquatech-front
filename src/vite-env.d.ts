/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PASSWORD_MIN_LENGTH?: string;
  readonly VITE_PASSWORD_MAX_LENGTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
