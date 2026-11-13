import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase helpers.
 *
 * - A NEW client is created for every call. The old code kept one shared
 *   module-level client, so one user's auth state could leak into another
 *   request. Sessions are NOT persisted here: the app keeps its own signed
 *   cookie (see lib/auth-session.ts).
 * - Nothing throws at import time any more. A missing/invalid setting is
 *   reported as AuthConfigError so the API can answer with a clear JSON error
 *   instead of an HTML 500 page (which made the login page show
 *   "Unexpected token <" and look like a wrong-password problem).
 */

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

export type AuthLikeError = {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
};

function readEnv(name: string): string {
  // Trim spaces and accidental quotes: KEY="value" copied into Vercel/.env.
  return (process.env[name] ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

function getUrl(): string {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");

  if (!url) {
    throw new AuthConfigError(
      "NEXT_PUBLIC_SUPABASE_URL সেট করা নেই (.env.local পরীক্ষা করুন, তারপর সার্ভার রিস্টার্ট করুন)।",
    );
  }

  try {
    new URL(url);
  } catch {
    throw new AuthConfigError(
      "NEXT_PUBLIC_SUPABASE_URL সঠিক নয়। এটি https://xxxx.supabase.co ধরনের হতে হবে।",
    );
  }

  return url;
}

function build(key: string, flow: "pkce" | "implicit"): SupabaseClient {
  return createClient(getUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: flow,
    },
  });
}

/** Anon (public) client – used for sign-in, user lookup by token, reset e-mail. */
export function getSupabase(flow: "pkce" | "implicit" = "pkce"): SupabaseClient {
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!anonKey) {
    throw new AuthConfigError("NEXT_PUBLIC_SUPABASE_ANON_KEY সেট করা নেই।");
  }

  return build(anonKey, flow);
}

/** Service-role client – server only. Needed to create confirmed users. */
export function getSupabaseAdmin(): SupabaseClient {
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceKey) {
    throw new AuthConfigError(
      "SUPABASE_SERVICE_ROLE_KEY সেট করা নেই (Supabase → Project Settings → API Keys → secret key)।",
    );
  }

  return build(serviceKey, "pkce");
}

/** True when Supabase could not be reached at all (wrong URL, offline, DNS...). */
export function isConnectionError(error: AuthLikeError): boolean {
  return (
    error.name === "AuthRetryableFetchError" ||
    error.status === 0 ||
    (typeof error.status === "number" && error.status >= 500) ||
    /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(error.message ?? "")
  );
}

/** True when the anon/service key was rejected. */
export function isApiKeyError(error: AuthLikeError): boolean {
  return (
    error.code === "invalid_api_key" ||
    /invalid api key|invalid jwt|no api key/i.test(error.message ?? "")
  );
}