import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthConfigError,
  getSupabaseAdmin,
  isApiKeyError,
  isConnectionError,
} from "../../../../lib/auth-db";
import { createSession } from "../../../../lib/auth-session";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
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
    return fail("নাম, সঠিক ইমেইল এবং কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।", 400);
  }

  try {
    const { name, email, password } = parsed.data;

    // IMPORTANT: the admin API creates the user as already e-mail-confirmed.
    // The old code used the public signUp(), which (with Supabase's default
    // "Confirm email" = ON) creates an UNCONFIRMED user: login then fails
    // forever, and Supabase's built-in mailer allows only a few e-mails/hour,
    // so registration itself also failed with "email rate limit exceeded".
    const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (error) {
      console.error("[auth/register] supabase error:", error.code, error.status, error.message);

      if (error.code === "email_exists" || error.code === "user_already_exists") {
        return fail("এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে। লগইন করুন।", 409);
      }

      if (error.code === "weak_password") {
        return fail("পাসওয়ার্ড দুর্বল। আরও শক্তিশালী পাসওয়ার্ড দিন।", 400);
      }

      if (isApiKeyError(error)) {
        return fail(
          "SUPABASE_SERVICE_ROLE_KEY ভুল বা মেয়াদোত্তীর্ণ। Supabase থেকে সঠিক secret key বসান।",
          500,
        );
      }

      if (isConnectionError(error)) {
        return fail(
          "Supabase-এর সাথে সংযোগ হচ্ছে না। NEXT_PUBLIC_SUPABASE_URL ও ইন্টারনেট পরীক্ষা করুন।",
          502,
        );
      }

      return fail("অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।", 400);
    }

    if (!data.user) {
      return fail("অ্যাকাউন্ট তৈরি করা যায়নি।", 400);
    }

    await createSession({
      id: data.user.id,
      email: data.user.email ?? email,
      name,
    });

    return NextResponse.json(
      { ok: true, user: { name, email } },
      { status: 201, headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error("[auth/register] config:", error.message);
      return fail(error.message, 500);
    }

    console.error("[auth/register] failed:", error);
    return fail("অ্যাকাউন্ট তৈরি করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।", 500);
  }
}