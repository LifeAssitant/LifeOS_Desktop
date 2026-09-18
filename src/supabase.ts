import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env"
    );
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/** Parse lifeos://auth/... deep links into query + hash params. */
export function parseAuthDeepLink(url: string): URLSearchParams {
  const normalized = url.replace(/^lifeos:\/\//i, "https://lifeos.local/");
  const parsed = new URL(normalized);
  const params = new URLSearchParams(parsed.search);
  if (parsed.hash && parsed.hash.length > 1) {
    const hash = parsed.hash.replace(/^#/, "");
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }
  return params;
}

export async function sessionFromDeepLink(url: string): Promise<Session | null> {
  const supabase = getSupabase();
  const params = parseAuthDeepLink(url);
  const code = params.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
    return data.session;
  }
  return null;
}

export async function startGoogleOAuth(): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "lifeos://auth/callback",
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Google sign-in URL missing");
  if (window.lifeosDesktop?.openExternal) {
    await window.lifeosDesktop.openExternal(data.url);
  } else {
    window.open(data.url, "_blank");
  }
}
