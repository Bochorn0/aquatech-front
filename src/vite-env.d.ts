/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PASSWORD_MIN_LENGTH?: string;
  readonly VITE_PASSWORD_MAX_LENGTH?: string;
  readonly VITE_PASSWORD_REQUIRE_UPPERCASE?: string;
  readonly VITE_PASSWORD_REQUIRE_DIGIT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
