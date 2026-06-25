/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the NestJS backend, e.g. http://localhost:3000/api.
   *  When unset, the app runs in local mode (sample data + localStorage). */
  readonly VITE_API_URL?: string;
  /** Bearer token sent to the backend when it has auth enabled (AUTH_ENABLED).
   *  Leave unset for an open/local backend. */
  readonly VITE_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
