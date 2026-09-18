/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface LifeosDesktopBridge {
  notify: (title: string, body: string) => Promise<boolean>;
  getDesktopToken: () => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
  onAuthUrl: (handler: (url: string) => void) => () => void;
}

interface Window {
  lifeosDesktop?: LifeosDesktopBridge;
}
