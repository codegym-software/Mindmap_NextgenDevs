/// <reference types="vite/client" />

/**
 * Định nghĩa các biến môi trường (environment variables) từ file .env
 * Điều này giúp TypeScript hiểu được import.meta.env
 */
interface ImportMetaEnv {
  readonly VITE_COGNITO_DOMAIN: string;
  readonly VITE_COGNITO_CLIENT_ID: string;
  readonly VITE_COGNITO_REDIRECT_URI: string;
  readonly VITE_LOGOUT_REDIRECT_URI: string;
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
