import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthConfigError,
  getSupabase,
  isApiKeyError,
  isConnectionError,
} from "../../../../lib/auth-db";
import { createSession } from "../../../../lib/auth-session";

const schema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

const NO_STORE = { "Cache-Control": "no-store" };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return fail("অনুরোধের তথ্য সঠিক নয়। আবার চেষ্টা করুন।", 400);
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return fail("সঠিক ইমেইল ও পাসওয়ার্ড দিন।", 400);
  }

  try {
    const { email, password } = parsed.data;

    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      if (error) {
        console.error("[auth/login] supabase error:", error.code, error.status, error.message);

        if (error.code === "email_not_confirmed") {
          return fail(
            "এই অ্যাকাউন্টের ইমেইল নিশ্চিত করা নেই। পুরনো অনিশ্চিত অ্যাকাউন্ট Supabase ড্যাশবোর্ড থেকে মুছে নতুন করে রেজিস্ট্রেশন করুন।",
            403,
          );
        }

        if (isApiKeyError(error)) {
          return fail(
            "NEXT_PUBLIC_SUPABASE_ANON_KEY ভুল বা মেয়াদোত্তীর্ণ। Supabase থেকে সঠিক publishable key বসান।",
            500,
          );
        }

        if (isConnectionError(error)) {
          return fail(
            "Supabase-এর সাথে সংযোগ হচ্ছে না। NEXT_PUBLIC_SUPABASE_URL ও ইন্টারনেট পরীক্ষা করুন।",
            502,
          );
        }
      }

      return fail("ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।", 401);
    }

    const user = data.user;
    const name =
      typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
        ? user.user_metadata.name.trim()
        : (user.email ?? email);

    await createSession({
      id: user.id,
      email: user.email ?? email,
      name,
    });

    return NextResponse.json(
      { ok: true, user: { name, email: user.email ?? email } },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error("[auth/login] config:", error.message);
      return fail(error.message, 500);
    }

    console.error("[auth/login] failed:", error);
    return fail("লগইন সম্পন্ন হয়নি। সার্ভার সেটিংস পরীক্ষা করুন।", 500);
  }
}