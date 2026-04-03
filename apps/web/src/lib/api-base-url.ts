type AppImportMetaEnv = ImportMetaEnv & {
  readonly VITE_API_BASE_URL?: string;
};

export const apiBaseUrl = (import.meta.env as AppImportMetaEnv).VITE_API_BASE_URL ?? "http://localhost:3001";
