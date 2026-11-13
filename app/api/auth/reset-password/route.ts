import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthConfigError, getSupabase, getSupabaseAdmin } from "../../../../lib/auth-db";

const schema = z.object({
  token: z.string().min(10).max(4096), // recovery access token from the e-mail link
  password: z.string().min(8).max(128),
});

const NO_STORE = { "Cache-Control": "no-store" };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return fail("অনুরোধের তথ্য সঠিক নয়।", 400);
    }

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return fail("কমপক্ষে ৮ অক্ষরের নতুন পাসওয়ার্ড দিন।", 400);
    }

    const { token, password } = parsed.data;

    // 1) Prove the token is a valid, unexpired Supabase token and find its owner.
    const { data: userData, error: userError } = await getSupabase().auth.getUser(token);

    if (userError || !userData.user) {
      return fail("রিসেট লিংকটি মেয়াদোত্তীর্ণ বা অবৈধ। নতুন লিংক নিন।", 400);
    }

    // 2) Set the new password for exactly that user (server-side, service role).
    const { error: updateError } = await getSupabaseAdmin().auth.admin.updateUserById(
      userData.user.id,
      { password },
    );

    if (updateError) {
      console.error("[auth/reset-password] update error:", updateError.code, updateError.message);

      if (updateError.code === "weak_password") {
        return fail("পাসওয়ার্ড দুর্বল। আরও শক্তিশালী পাসওয়ার্ড দিন।", 400);
      }

      return fail("পাসওয়ার্ড পরিবর্তন করা যায়নি।", 500);
    }

    return NextResponse.json(
      { ok: true, message: "পাসওয়ার্ড পরিবর্তন হয়েছে। এখন লগইন করুন।" },
      { headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error("[auth/reset-password] config:", error.message);
      return fail(error.message, 500);
    }

    console.error("[auth/reset-password] failed:", error);
    return fail("পাসওয়ার্ড পরিবর্তন করা যায়নি।", 500);
  }
}